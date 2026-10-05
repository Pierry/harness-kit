#!/usr/bin/env python3
"""
Eval judge backed by Jev (TypeSafe AI's System One model).

The default judge is a fresh Claude evaluator. That judge grades output from
its own model family, which inflates scores (Wataoka et al.,
arXiv:2410.21819). Jev is a different family and returns typed, calibrated
probabilities instead of prose, so its output cannot be malformed.

How the rubric is asked, following TypeSafe's own guidance for jev-1.13
(docs.typesafe.ai: primitives/score, confidence, model-jaggedness/jev-1.13):

- One judgment per question. A rubric dimension usually bundles several
  ("baseline, target, horizon? guardrails? kill criteria?"). Each `- check:`
  line under a dimension is one Noul (yes/no) question; the dimension score is
  10 x the mean probability of yes, the expected share of checks met.
  Dimensions without checks fall back to one Score question over the rubric's
  own 0/5/10 anchors, the weaker mode.
- Code does what code can. `- absent: <regex>` checks run here, not in Jev
  (it cannot count or spot a literal character reliably). Weights, the total
  and the threshold stay in eval-score.py.
- Point at the part that matters. The artifact is sent as an object keyed by
  its `## ` sections (`sections.success_metrics`), so a check can name the
  section it judges instead of reading the whole document. A check naming a
  section the artifact lacks fails in code without asking Jev.
- Escalate when unsure (Jung et al., "Trust or Escalate", arXiv:2407.18370).
  The total is recomputed with every uncertain answer forced to no, then to
  yes. If the pass/fail verdict differs between the two, Jev cannot decide
  this artifact, and the script exits 3 so the Claude evaluator judges it.

Output is the judge JSON shape eval-score.py verifies, plus per-check detail.
`feedback` lists the failed checks verbatim: that is what the retry fixes.
Every run is appended to .claude/runtime/outputs/evals/jev-judge.jsonl so
agreement with the Claude judge and with humans can be measured later.

Opt-in via `/hk:eval jev` (stored in .claude/hk-config.json). Never runs in CI:
paid API.

Usage:
  jev-judge.py --rubric EVAL.md --artifact PRD.md > judge.json
  eval-score.py --rubric EVAL.md --scores judge.json

Exit codes:
  0  judge JSON written to stdout
  2  rubric has no weighted dimensions (not a Jev-shaped eval)
  3  use the Claude judge: judge is local, no key, artifact too large,
     API error, or Jev too uncertain to decide pass/fail
"""

import argparse
import importlib.util
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


def _load(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).resolve().parent / filename)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


hk_config = _load("hk_config", "hk-config.py")
eval_score = _load("eval_score", "eval-score.py")

ENDPOINT = "https://api.typesafe.ai/v1/systemone"
MODEL = os.environ.get("TYPESAFE_MODEL", "jev-latest")
# 32k tokens covers state plus the longest question. ~4 chars per token,
# with headroom for the question itself.
MAX_STATE_CHARS = 30_000 * 4
# A Noul between these bounds is the model saying it does not know.
UNSURE_LOW, UNSURE_HIGH = 0.3, 0.7
YES = 0.5
LOW_SCORE = 7.0

SECTION_RE = re.compile(r"^###\s+(.+?)\s*\(weight\s+(\d+)%\)\s*$", re.MULTILINE)
ANCHOR_RE = re.compile(r"^-\s+(\d+(?:\.\d+)?):\s*(.+)$")
CHECK_RE = re.compile(r"^-\s+check:\s*(.+)$")
ABSENT_RE = re.compile(r"^-\s+absent:\s*(.+)$")
SECTION_REF_RE = re.compile(r"`sections\.([a-z0-9_]+)`")
DEFAULT_LEVELS = [
    (0.0, "Missing, vague, or fails the question"),
    (5.0, "Present but generic, thin, or partly meets the question"),
    (10.0, "Concrete, specific, and fully meets the question"),
]


def dimension_key(label: str) -> str:
    """Same keys eval-score.py expects."""
    return re.sub(r"[^a-z0-9]+", "_", label.strip().lower()).strip("_")


def parse_dimensions(md: str) -> list[dict]:
    """One entry per weighted dimension: key, question, checks, levels."""
    dims = []
    matches = list(SECTION_RE.finditer(md))
    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(md)
        body = re.split(r"^##\s", md[m.end() : end], maxsplit=1, flags=re.MULTILINE)[0]
        question, anchors, checks, absent = [], [], [], []
        for line in body.splitlines():
            line = line.strip()
            if a := ANCHOR_RE.match(line):
                anchors.append((float(a.group(1)), a.group(2).strip()))
            elif c := CHECK_RE.match(line):
                checks.append(c.group(1).strip())
            elif r := ABSENT_RE.match(line):
                absent.append(r.group(1).strip())
            elif line:
                question.append(line)
        anchors.sort()
        dims.append(
            {
                "key": dimension_key(m.group(1)),
                "name": m.group(1).strip(),
                "weight": int(m.group(2)),
                "question": " ".join(question) or m.group(1).strip(),
                "checks": checks,
                "absent": absent,
                "levels": anchors if len(anchors) >= 2 else DEFAULT_LEVELS,
            }
        )
    return dims


def artifact_state(text: str) -> dict:
    """The artifact as {title, sections: {slug: body}}, split on `## ` headings.

    Leading numbering (`## 3) Scope and Non-Goals`) is dropped from the slug so
    rubric checks can name `sections.scope_and_non_goals`.
    """
    title, sections, current, buf = "", {}, "preamble", []
    for line in text.splitlines():
        if line.startswith("# ") and not title:
            title = line[2:].strip()
        elif line.startswith("## "):
            if "".join(buf).strip():
                sections[current] = "\n".join(buf).strip()
            heading = re.sub(r"^[\d.)\s]+", "", line[3:]).strip()
            current, buf = dimension_key(heading) or "section", []
        else:
            buf.append(line)
    if "".join(buf).strip():
        sections[current] = "\n".join(buf).strip()
    return {"title": title, "sections": sections}


def check_id(dim_key: str, i: int) -> str:
    return f"{dim_key}__{i}"


def build_request(dims: list[dict], state: dict) -> tuple[dict, dict]:
    """Questions for Jev, plus checks already decided in code (missing section)."""
    questions, decided = {}, {}
    for d in dims:
        if d["checks"]:
            for i, text in enumerate(d["checks"]):
                cid = check_id(d["key"], i)
                missing = [s for s in SECTION_REF_RE.findall(text) if s not in state["sections"]]
                if missing:
                    decided[cid] = 0.0
                else:
                    questions[cid] = {"type": "noul", "instructions": text}
        elif not d["absent"]:
            questions[d["key"]] = {
                "type": "score",
                "instructions": f"Rate the document on {d['name']}. {d['question']}",
                "criteria": [desc for _, desc in d["levels"]],
            }
    return {"state": state, "model": MODEL, "questions": questions}, decided


def _score_range(d: dict, a: dict) -> tuple[float, float, float]:
    """Expected value plus the lowest and highest level holding real probability."""
    values = [v for v, _ in d["levels"]]
    probs = {int(k): float(p) for k, p in (a.get("probabilities") or {}).items()}
    if not probs:
        idx = min(round(float(a["score"])), len(values) - 1)
        probs = {idx: 1.0}
    ev = sum(p * values[k] for k, p in probs.items())
    held = [values[k] for k, p in probs.items() if p >= 0.15] or [ev]
    return ev, min(held), max(held)


def to_judge(dims: list[dict], response: dict, decided: dict, artifact: str) -> dict:
    """Combine Jev answers and code checks into the judge JSON, with bounds."""
    answers = response.get("answers", {})
    scores, low, high, checks, feedback = {}, {}, {}, {}, []
    for d in dims:
        results = []  # (label, p_yes) per check
        for i, text in enumerate(d["checks"]):
            cid = check_id(d["key"], i)
            if cid in decided:
                p = decided[cid]
            else:
                a = answers.get(cid)
                if not a or a.get("type") != "noul":
                    raise ValueError(f"Jev returned no answer for `{cid}`")
                p = float(a["noul"])
            results.append((text, p))
        for pattern in d["absent"]:
            results.append(
                (f"no match for /{pattern}/", 0.0 if re.search(pattern, artifact) else 1.0)
            )

        if results:
            n = len(results)
            scores[d["key"]] = 10 * sum(p for _, p in results) / n
            low[d["key"]] = 10 * sum(p >= UNSURE_HIGH for _, p in results) / n
            high[d["key"]] = 10 * sum(p > UNSURE_LOW for _, p in results) / n
            checks[d["key"]] = [{"check": t, "p_yes": round(p, 3)} for t, p in results]
            for t, p in results:
                if p < YES:
                    feedback.append(f"{d['key']}: fails: {t} (p={p:.2f})")
                elif p < UNSURE_HIGH:
                    feedback.append(f"{d['key']}: unclear: {t} (p={p:.2f})")
        else:
            a = answers.get(d["key"])
            if not a or a.get("type") != "score":
                raise ValueError(f"Jev returned no score for `{d['key']}`")
            ev, lo, hi = _score_range(d, a)
            scores[d["key"]], low[d["key"]], high[d["key"]] = ev, lo, hi
            if ev < LOW_SCORE:
                feedback.append(f"{d['key']}: {ev:.1f}/10. Rubric asks: {d['question']}")

    scores = {k: round(v, 2) for k, v in scores.items()}
    return {
        "scores": scores,
        "bounds": {k: [round(low[k], 2), round(high[k], 2)] for k in scores},
        "checks": checks,
        "feedback": feedback,
        "judge": response.get("model", MODEL),
        "usage": response.get("usage", {}),
    }


def undecided(dims: list[dict], judge: dict, threshold: float | None) -> bool:
    """True when forcing the uncertain answers either way flips pass/fail."""
    if threshold is None:
        return False
    w = {d["key"]: d["weight"] for d in dims}
    lo = sum(judge["bounds"][k][0] * w[k] for k in w) / 100
    hi = sum(judge["bounds"][k][1] * w[k] for k in w) / 100
    return (lo >= threshold) != (hi >= threshold)


def call_jev(payload: dict, key: str, timeout: float = 30.0, attempts: int = 3) -> dict:
    """POST with backoff on 429/529, as the API reference asks."""
    for attempt in range(attempts):
        req = urllib.request.Request(
            ENDPOINT,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code not in (429, 529) or attempt == attempts - 1:
                raise
            time.sleep(float(e.headers.get("retry-after") or 2**attempt))
    raise RuntimeError("unreachable")


def log_run(root: Path, rubric: Path, artifact: Path, judge: dict, verdict: str) -> None:
    out = root / ".claude/runtime/outputs/evals/jev-judge.jsonl"
    try:
        out.parent.mkdir(parents=True, exist_ok=True)
        with open(out, "a", encoding="utf-8") as f:
            f.write(
                json.dumps(
                    {
                        "ts": time.strftime("%Y-%m-%dT%H:%M:%S"),
                        "rubric": str(rubric),
                        "artifact": str(artifact),
                        "verdict": verdict,
                        **judge,
                    }
                )
                + "\n"
            )
    except OSError:
        pass  # the log is for later analysis, never a reason to fail the eval


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--rubric", required=True, type=Path)
    ap.add_argument("--artifact", required=True, type=Path)
    args = ap.parse_args()

    root = hk_config.project_root()
    settings = hk_config.eval_settings(root)
    if settings["judge"] != "jev":
        print(
            "[jev-judge] eval judge is local (/hk:eval jev to switch), use the Claude judge",
            file=sys.stderr,
        )
        return 3
    key = hk_config.key_value(root, settings["key_env"])
    if not key:
        print(
            f"[jev-judge] judge is jev but {settings['key_env']} is not set, "
            "use the Claude judge and tell the user to run /hk:eval jev",
            file=sys.stderr,
        )
        return 3

    rubric_md = args.rubric.read_text(encoding="utf-8")
    dims = parse_dimensions(rubric_md)
    if not dims:
        print(
            f"[jev-judge] no weighted dimensions in {args.rubric.name}, use the Claude judge",
            file=sys.stderr,
        )
        return 2

    artifact = args.artifact.read_text(encoding="utf-8")
    if len(artifact) > MAX_STATE_CHARS:
        print(
            f"[jev-judge] artifact is {len(artifact)} chars, over Jev's context, "
            "use the Claude judge",
            file=sys.stderr,
        )
        return 3

    try:
        payload, decided = build_request(dims, artifact_state(artifact))
        response = call_jev(payload, key) if payload["questions"] else {"answers": {}}
        judge = to_judge(dims, response, decided, artifact)
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError) as e:
        detail = (
            e.read().decode("utf-8", "replace")[:300]
            if isinstance(e, urllib.error.HTTPError)
            else e
        )
        print(f"[jev-judge] Jev call failed ({detail}), use the Claude judge", file=sys.stderr)
        return 3

    _, threshold = eval_score.parse_rubric(rubric_md)
    if undecided(dims, judge, threshold):
        log_run(root, args.rubric, args.artifact, judge, "escalated")
        print(
            "[jev-judge] uncertain answers decide pass/fail here "
            f"(bounds straddle {threshold}), use the Claude judge",
            file=sys.stderr,
        )
        return 3

    log_run(root, args.rubric, args.artifact, judge, "judged")
    print(json.dumps(judge, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
