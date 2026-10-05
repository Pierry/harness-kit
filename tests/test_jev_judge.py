#!/usr/bin/env python3
"""
Tests for the Jev-backed eval judge.

The HTTP call is mocked. These pin the rubric-to-question mapping (one Noul
per atomic check, regex checks in code), that every section a check names
exists in the good examples, the escalation rule, and that the output passes
the same verifier the Claude judge goes through.
They cannot pin whether Jev agrees with a human reviewer.
"""

import contextlib
import importlib.util
import io
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

REPO = Path(__file__).resolve().parents[1]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


jj = load("jev_judge", REPO / ".claude/scripts/jev-judge.py")
HK_CONFIG = REPO / ".claude/scripts/hk-config.py"
es = load("eval_score", REPO / ".claude/scripts/eval-score.py")

PRD_QUALITY = REPO / ".claude/agents/product-manager/evals/prd-quality.md"
PLAN_QUALITY = REPO / ".claude/agents/staff-software-engineer/evals/plan-quality.md"
WEIGHTED = [p for p in sorted((REPO / ".claude/agents").glob("*/evals/*.md"))
            if "(weight" in p.read_text(encoding="utf-8")]


def answer(probs, confidence=0.9):
    return {"type": "score", "score": 0, "probabilities": probs, "confidence": confidence}


def noul(p):
    return {"type": "noul", "noul": p}


GOOD = {
    "prd": (PRD_QUALITY, REPO / ".claude/agents/product-manager/guides/examples/good-prd-example.md"),
    "prp": (REPO / ".claude/agents/product-manager/evals/prp-quality.md",
            REPO / ".claude/agents/product-manager/guides/examples/good-prp-example.md"),
    "design": (REPO / ".claude/agents/system-architect/evals/design-quality.md",
               REPO / ".claude/agents/system-architect/guides/examples/good-system-design-example.md"),
}


def all_yes(dims, state, p=1.0):
    payload, decided = jj.build_request(dims, state)
    return {"answers": {q: noul(p) if v["type"] == "noul" else answer({"2": 1.0})
                        for q, v in payload["questions"].items()}}, decided


class ParseDimensions(unittest.TestCase):
    def test_keys_match_what_eval_score_reads_from_every_rubric(self):
        for rubric in WEIGHTED:
            md = rubric.read_text(encoding="utf-8")
            weights, _ = es.parse_rubric(md)
            keys = [d["key"] for d in jj.parse_dimensions(md)]
            self.assertEqual(sorted(keys), sorted(weights), rubric.name)

    def test_every_weighted_dimension_has_atomic_checks(self):
        for rubric in WEIGHTED:
            for d in jj.parse_dimensions(rubric.read_text(encoding="utf-8")):
                self.assertTrue(d["checks"] or d["absent"], f"{rubric.name}:{d['key']}")

    def test_checks_and_anchors_stay_out_of_the_question(self):
        dims = jj.parse_dimensions(PRD_QUALITY.read_text(encoding="utf-8"))
        clarity = next(d for d in dims if d["key"] == "clarity")
        self.assertEqual(len(clarity["checks"]), 4)
        self.assertEqual([v for v, _ in clarity["levels"]], [0.0, 5.0, 10.0])
        self.assertNotIn("check:", clarity["question"])
        self.assertNotIn("- 10:", clarity["question"])

    def test_last_dimension_stops_at_the_next_h2(self):
        dims = jj.parse_dimensions(PRD_QUALITY.read_text(encoding="utf-8"))
        self.assertNotIn("Retry", dims[-1]["question"])


class ArtifactState(unittest.TestCase):
    def test_sections_keyed_by_heading_without_numbering(self):
        st = jj.artifact_state("# T\n\nintro\n\n## 3) Scope and Non-Goals\nx\n\n## 12. Trade-offs\ny\n")
        self.assertEqual(st["title"], "T")
        self.assertEqual(st["sections"], {"preamble": "intro", "scope_and_non_goals": "x", "trade_offs": "y"})

    def test_every_section_a_check_names_exists_in_the_good_examples(self):
        for name, (rubric, example) in GOOD.items():
            dims = jj.parse_dimensions(rubric.read_text(encoding="utf-8"))
            _, decided = jj.build_request(dims, jj.artifact_state(example.read_text(encoding="utf-8")))
            self.assertEqual(decided, {}, name)

    def test_absent_regexes_do_not_fire_on_the_good_examples(self):
        for name, (rubric, example) in GOOD.items():
            text = example.read_text(encoding="utf-8")
            for d in jj.parse_dimensions(rubric.read_text(encoding="utf-8")):
                for pattern in d["absent"]:
                    self.assertIsNone(jj.re.search(pattern, text), f"{name}: {pattern}")


class ToJudge(unittest.TestCase):
    dims = [
        {"key": "a", "name": "A", "weight": 50, "question": "qa", "checks": ["c1", "c2"],
         "absent": [], "levels": jj.DEFAULT_LEVELS},
        {"key": "b", "name": "B", "weight": 50, "question": "qb", "checks": [],
         "absent": [], "levels": jj.DEFAULT_LEVELS},
    ]

    def test_dimension_score_is_share_of_checks_met(self):
        out = jj.to_judge(self.dims, {"answers": {
            "a__0": noul(1.0), "a__1": noul(0.5),
            "b": answer({"0": 0.0, "1": 0.3, "2": 0.7}),
        }}, {}, "")
        self.assertEqual(out["scores"], {"a": 7.5, "b": 8.5})

    def test_feedback_names_failed_and_unclear_checks(self):
        out = jj.to_judge(self.dims, {"answers": {
            "a__0": noul(0.1), "a__1": noul(0.6), "b": answer({"2": 1.0}),
        }}, {}, "")
        self.assertIn("a: fails: c1 (p=0.10)", out["feedback"])
        self.assertIn("a: unclear: c2 (p=0.60)", out["feedback"])

    def test_absent_check_runs_in_code(self):
        dims = [{"key": "v", "name": "V", "weight": 100, "question": "", "checks": [],
                 "absent": ["\u2014"], "levels": jj.DEFAULT_LEVELS}]
        payload, decided = jj.build_request(dims, jj.artifact_state("x"))
        self.assertEqual(payload["questions"], {})
        self.assertEqual(jj.to_judge(dims, {"answers": {}}, decided, "a \u2014 b")["scores"], {"v": 0.0})
        self.assertEqual(jj.to_judge(dims, {"answers": {}}, decided, "a, b")["scores"], {"v": 10.0})

    def test_check_on_missing_section_fails_without_asking_jev(self):
        dims = [{"key": "m", "name": "M", "weight": 100, "question": "", "absent": [],
                 "checks": ["`sections.rollout` has phases."], "levels": jj.DEFAULT_LEVELS}]
        payload, decided = jj.build_request(dims, jj.artifact_state("## Goal\nx"))
        self.assertEqual(payload["questions"], {})
        self.assertEqual(jj.to_judge(dims, {"answers": {}}, decided, "")["scores"], {"m": 0.0})

    def test_missing_answer_is_an_error(self):
        with self.assertRaises(ValueError):
            jj.to_judge(self.dims, {"answers": {"a__0": noul(1.0)}}, {}, "")


class Escalation(unittest.TestCase):
    dims = [{"key": "a", "name": "A", "weight": 100, "question": "", "absent": [],
             "checks": ["c1", "c2", "c3", "c4", "c5"], "levels": jj.DEFAULT_LEVELS}]

    def judge(self, ps):
        return jj.to_judge(self.dims, {"answers": {f"a__{i}": noul(p) for i, p in enumerate(ps)}}, {}, "")

    def test_confident_answers_decide(self):
        self.assertFalse(jj.undecided(self.dims, self.judge([1, 1, 1, 1, 0.02]), 8.0))
        self.assertFalse(jj.undecided(self.dims, self.judge([1, 1, 0, 0, 0]), 8.0))

    def test_unsure_answer_that_flips_the_verdict_escalates(self):
        # 4 clear yes + 1 unsure: 8.0 if yes, 6.0 if no. Threshold 8.0 sits between.
        self.assertTrue(jj.undecided(self.dims, self.judge([1, 1, 1, 0.5, 0]), 8.0))

    def test_unsure_answer_that_cannot_flip_does_not_escalate(self):
        self.assertFalse(jj.undecided(self.dims, self.judge([0, 0, 0, 0.5, 0]), 8.0))


class EndToEnd(unittest.TestCase):
    def test_all_yes_on_good_examples_passes_eval_score(self):
        for name, (rubric, example) in GOOD.items():
            md, text = rubric.read_text(encoding="utf-8"), example.read_text(encoding="utf-8")
            dims = jj.parse_dimensions(md)
            response, decided = all_yes(dims, jj.artifact_state(text))
            judge = jj.to_judge(dims, response, decided, text)
            weights, threshold = es.parse_rubric(md)
            code, lines = es.verify(weights, threshold, judge)
            self.assertEqual(code, 0, f"{name}: {lines}")

    def run_main(self, project, env):
        argv = ["jev-judge.py", "--rubric", str(PRD_QUALITY), "--artifact", str(PRD_QUALITY)]
        with mock.patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": project, **env}, clear=True), \
             mock.patch("sys.argv", argv), \
             contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return jj.main()

    def test_local_judge_exits_3_without_calling_the_api(self):
        with tempfile.TemporaryDirectory() as d, mock.patch.object(jj, "call_jev") as call:
            self.assertEqual(self.run_main(d, {"TYPESAFE_API_KEY": "k"}), 3)
            call.assert_not_called()

    def test_jev_without_key_exits_3(self):
        with tempfile.TemporaryDirectory() as d, mock.patch.object(jj, "call_jev") as call:
            set_judge(d, "jev")
            self.assertEqual(self.run_main(d, {}), 3)
            call.assert_not_called()

    def test_api_failure_exits_3(self):
        with tempfile.TemporaryDirectory() as d, \
             mock.patch.object(jj, "call_jev", side_effect=TimeoutError("slow")):
            set_judge(d, "jev")
            self.assertEqual(self.run_main(d, {"TYPESAFE_API_KEY": "k"}), 3)

    def test_jev_with_key_returns_judge_json(self):
        dims = jj.parse_dimensions(PRD_QUALITY.read_text(encoding="utf-8"))
        fake, _ = all_yes(dims, jj.artifact_state(PRD_QUALITY.read_text(encoding="utf-8")))
        with tempfile.TemporaryDirectory() as d, \
             mock.patch.object(jj, "call_jev", return_value=fake) as call:
            set_judge(d, "jev", key_env="MY_KEY")
            self.assertEqual(self.run_main(d, {"MY_KEY": "k"}), 0)
            self.assertEqual(call.call_args.args[1], "k")


def set_judge(project, judge, key_env="TYPESAFE_API_KEY"):
    p = Path(project) / ".claude/hk-config.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps({"eval": {"judge": judge, "key_env": key_env}}))


class HkConfig(unittest.TestCase):
    def run_cfg(self, project, *args, stdin=None, env=None):
        e = {"PATH": os.environ["PATH"], "CLAUDE_PROJECT_DIR": project, **(env or {})}
        return subprocess.run(["python3", str(HK_CONFIG), *args], input=stdin,
                              capture_output=True, text=True, env=e)

    def test_defaults_to_local(self):
        with tempfile.TemporaryDirectory() as d:
            r = self.run_cfg(d, "get", "eval")
            self.assertEqual(r.returncode, 0)
            self.assertIn("judge=local", r.stdout)

    def test_jev_without_key_exits_4(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(self.run_cfg(d, "eval", "jev").returncode, 4)
            self.assertEqual(self.run_cfg(d, "get", "eval").returncode, 4)

    def test_key_from_stdin_goes_to_settings_local_only(self):
        with tempfile.TemporaryDirectory() as d:
            r = self.run_cfg(d, "eval", "jev", "--key", "-", stdin="tsk_secret\n")
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertNotIn("tsk_secret", r.stdout + r.stderr)
            claude = Path(d) / ".claude"
            self.assertNotIn("tsk_secret", (claude / "hk-config.json").read_text())
            local = json.loads((claude / "settings.local.json").read_text())
            self.assertEqual(local["env"]["TYPESAFE_API_KEY"], "tsk_secret")
            self.assertIn("key=set", self.run_cfg(d, "get", "eval").stdout)

    def test_named_env_var(self):
        with tempfile.TemporaryDirectory() as d:
            r = self.run_cfg(d, "eval", "jev", "--key-env", "TS_KEY", env={"TS_KEY": "x"})
            self.assertEqual(r.returncode, 0, r.stderr)
            cfg = json.loads((Path(d) / ".claude/hk-config.json").read_text())
            self.assertEqual(cfg["eval"], {"judge": "jev", "key_env": "TS_KEY"})

if __name__ == "__main__":
    unittest.main()
