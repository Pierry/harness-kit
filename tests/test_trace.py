#!/usr/bin/env python3
"""
Tests for the traceability layer (trace.py) and the manifest-mode graph interface.

Each test builds a throwaway git repo. They pin the contract the graph
engineering post is about: a link names a requirement that exists, a commit
git can resolve, an edge the ontology allows; the scope gate blocks files
outside the plan; settle turns tested links VALIDATED and moved symbols STALE.
Full mode (FalkorDB, Graphiti, Joern) is not exercised here: it needs the graph
venv, a key and a JVM.
"""

import importlib.util
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
TRACE = REPO / ".claude/scripts/trace.py"
GRAPH = REPO / ".claude/scripts/graph.py"

spec = importlib.util.spec_from_file_location("trace", TRACE)
tr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tr)


def sh(cwd, *args, check=True):
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True, check=check)


class Repo:
    def __init__(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name)
        sh(self.path, "git", "init", "-q", "-b", "main")
        sh(self.path, "git", "config", "user.email", "t@t")
        sh(self.path, "git", "config", "user.name", "t")
        (self.path / "src").mkdir()
        (self.path / "src/ship.py").write_text("def validate_weight(kg):\n    return kg <= 30\n")
        (self.path / "src/router.py").write_text("def select():\n    pass\n")
        sh(self.path, "git", "add", ".")
        sh(self.path, "git", "commit", "-qm", "base")
        (self.path / "prp.md").write_text(
            "**Success criteria (verifiable):**\n"
            "- [ ] REQ-001: Reject shipments over 30 kg at weight validation.\n"
            "- [ ] REQ-002: Router picks the cheapest carrier.\n"
        )

    def trace(self, *args, check=False):
        env = {**os.environ, "CLAUDE_PROJECT_DIR": str(self.path)}
        return subprocess.run(
            [sys.executable, str(TRACE), *args],
            cwd=self.path,
            capture_output=True,
            text=True,
            env=env,
            check=check,
        )

    def manifest(self):
        return tr.yaml_load((self.path / "trace/f.yml").read_text())

    def close(self):
        self.tmp.cleanup()


class YamlSubset(unittest.TestCase):
    def test_round_trip_of_what_trace_writes(self):
        data = {
            "feature": "f",
            "requirements": [{"id": "REQ-001", "text": "Given x: then y"}],
            "links": [
                {
                    "from": "REQ-001",
                    "to": "a.py::f",
                    "type": "AFFECTS",
                    "confidence": 0.8,
                    "methods": ["semble", "cpg_callers"],
                    "evidence": {"semble": "match #1"},
                }
            ],
        }
        self.assertEqual(tr.yaml_load(tr.yaml_dump(data)), data)

    def test_reads_the_shipped_ontology(self):
        onto = tr.yaml_load((REPO / ".claude/graph/ontology.yml").read_text())
        self.assertEqual(onto["version"], 1)
        self.assertEqual(onto["edges"]["AFFECTS"]["statuses"], ["PROPOSED", "VALIDATED", "STALE"])
        self.assertIn("commit", onto["edges"]["IMPLEMENTS"]["requires"])


class Requirements(unittest.TestCase):
    def test_prp_lines_become_stable_ids(self):
        reqs = tr.reqs_from_prp(
            "- [ ] REQ-001: a\n- [x] REQ-002: b\n- plain bullet\n- [ ] REQ-001: dup\n"
        )
        self.assertEqual([r["id"] for r in reqs], ["REQ-001", "REQ-002"])

    def test_atomize_ids_are_kept(self):
        reqs = tr.reqs_from_atoms({"atoms": [{"id": "A-7", "text": "x"}, {"text": "no id"}]})
        self.assertEqual(reqs, [{"id": "A-7", "text": "x"}])


class Lifecycle(unittest.TestCase):
    def setUp(self):
        self.r = Repo()
        self.assertEqual(self.r.trace("init", "f", "--prp", "prp.md").returncode, 0)

    def tearDown(self):
        self.r.close()

    def propose(self, req, symbol):
        return self.r.trace(
            "propose",
            "f",
            "--req",
            req,
            "--symbol",
            symbol,
            "--method",
            "semble",
            "--evidence",
            "semble=match",
            "--confidence",
            "0.8",
        )

    def test_propose_records_link_and_scope(self):
        self.assertEqual(self.propose("REQ-001", "src/ship.py::validate_weight").returncode, 0)
        m = self.r.manifest()
        self.assertEqual(m["links"][0]["status"], "PROPOSED")
        self.assertEqual([s["file"] for s in m["scope"]], ["src/ship.py"])

    def test_unknown_requirement_is_refused(self):
        self.assertEqual(self.propose("REQ-999", "src/ship.py::x").returncode, 2)

    def test_fabricated_commit_is_refused(self):
        p = self.r.trace(
            "implement",
            "f",
            "--req",
            "REQ-001",
            "--symbol",
            "src/ship.py::validate_weight",
            "--commit",
            "deadbeefdeadbeef",
        )
        self.assertNotEqual(p.returncode, 0)
        self.assertNotIn("IMPLEMENTS", (self.r.path / "trace/f.yml").read_text())

    def test_scope_gate_blocks_then_passes_after_explicit_widening(self):
        self.propose("REQ-001", "src/ship.py::validate_weight")
        sh(self.r.path, "git", "checkout", "-qb", "feat")
        (self.r.path / "src/ship.py").write_text("def validate_weight(kg):\n    return kg < 31\n")
        (self.r.path / "src/router.py").write_text("def select():\n    return 1\n")
        sh(self.r.path, "git", "commit", "-qam", "change")
        gate = self.r.trace("gate", "f")
        self.assertEqual(gate.returncode, 1)
        self.assertIn("src/router.py", gate.stdout)
        self.assertEqual(
            self.r.trace("scope", "f", "--add", "src/router.py").returncode, 2
        )  # needs a reason
        self.r.trace("scope", "f", "--add", "src/router.py", "--reason", "shared helper")
        self.assertEqual(self.r.trace("gate", "f").returncode, 0)

    def test_settle_validates_tested_links_and_stales_moved_symbols(self):
        self.propose("REQ-001", "src/ship.py::validate_weight")
        self.propose("REQ-002", "src/router.py::select")
        self.r.trace(
            "verify",
            "f",
            "--req",
            "REQ-001",
            "--test",
            "tests/t.py::test_reject",
            "--commit",
            "HEAD",
            check=True,
        )
        (self.r.path / "src/router.py").write_text("def choose():\n    pass\n")
        self.r.trace("settle", "--all", check=True)
        status = {
            lk["from"]: lk["status"] for lk in self.r.manifest()["links"] if lk["type"] == "AFFECTS"
        }
        self.assertEqual(status, {"REQ-001": "VALIDATED", "REQ-002": "STALE"})

    def test_validate_catches_illegal_edge_and_missing_requirement(self):
        self.propose("REQ-001", "src/ship.py::validate_weight")
        p = self.r.path / "trace/f.yml"
        p.write_text(
            p.read_text()
            .replace("type: AFFECTS", "type: OWNS")
            .replace("from: REQ-001", "from: REQ-404")
        )
        out = self.r.trace("validate")
        self.assertEqual(out.returncode, 1)
        self.assertIn("not in ontology", out.stdout)

    def test_clean_manifest_validates_and_summarizes(self):
        self.propose("REQ-001", "src/ship.py::validate_weight")
        self.assertEqual(self.r.trace("validate").returncode, 0)
        summary = self.r.trace("summary", "f").stdout
        self.assertIn("| REQ-001 | `src/ship.py::validate_weight` | PROPOSED |", summary)


class GraphManifestMode(unittest.TestCase):
    def test_four_calls_answer_from_manifests_without_a_database(self):
        r = Repo()
        try:
            r.trace("init", "f", "--prp", "prp.md", check=True)
            r.trace(
                "propose",
                "f",
                "--req",
                "REQ-001",
                "--symbol",
                "src/ship.py::validate_weight",
                "--method",
                "semble",
                "--evidence",
                "semble=x",
                check=True,
            )
            env = {**os.environ, "CLAUDE_PROJECT_DIR": str(r.path), "PATH": "/usr/bin:/bin"}

            def run(*a):
                return subprocess.run(
                    [sys.executable, str(GRAPH), *a],
                    cwd=r.path,
                    env=env,
                    capture_output=True,
                    text=True,
                )

            self.assertIn("REQ-001", run("knowledge", "reject heavy shipments weight").stdout)
            self.assertIn(
                "src/ship.py::validate_weight", run("symbols", "weight validation shipments").stdout
            )
            self.assertIn("AFFECTS", run("history", "src/ship.py").stdout)
            self.assertEqual(run("sync").returncode, 3)  # full-only command refuses in off mode
        finally:
            r.close()


if __name__ == "__main__":
    unittest.main()
