#!/usr/bin/env python3
"""
Eval score verifier.

The judge returns per-dimension scores AND the weighted total, and until now
nothing checked that the total followed from the scores. The gate was whatever
number the model wrote next to "weighted_total". Arithmetic is not a judgment
call, so it should not be left to a judge.

This reads the weights out of the rubric itself (`### Name (weight 20%)`),
recomputes the total from the dimension scores, and refuses a mismatch. What
remains inferential (is this dimension really an 8?) stays inferential. What is
computable is now computed.

It cannot fix the deeper limitation: the scores themselves are unvalidated
against human labels, and an LLM judging output from its own family inflates
scores (Panickssery et al., arXiv:2410.21819). Weights, arithmetic and the
threshold are enforced here; agreement with a human is not, and no amount of
scripting makes it so. See guides/calibration.md.

Usage:
  eval-score.py --rubric EVAL.md --scores judge.json
  eval-score.py --rubric EVAL.md --scores -            # read JSON from stdin

Exit codes:
  0  scores are consistent and meet the threshold
  1  below threshold (a real eval failure, retry per pipeline.md)
  2  the judge's output is malformed or its arithmetic does not check out
"""

import argparse
import json
import re
import sys
from pathlib import Path

WEIGHT_RE = re.compile(r"^###\s+(.+?)\s*\(weight\s+(\d+)%\)", re.MULTILINE)
THRESHOLD_RE = re.compile(r"^Threshold:.*?([0-9]+(?:\.[0-9]+)?)", re.MULTILINE)
TOLERANCE = 0.05


def dimension_key(label: str) -> str:
    """`Customer specificity` -> `customer_specificity`, matching the JSON keys."""
    return re.sub(r"[^a-z0-9]+", "_", label.strip().lower()).strip("_")


def parse_rubric(md: str) -> tuple[dict[str, int], float | None]:
    weights = {dimension_key(name): int(w) for name, w in WEIGHT_RE.findall(md)}
    m = THRESHOLD_RE.search(md)
    return weights, (float(m.group(1)) if m else None)


def verify(weights: dict[str, int], threshold: float | None, payload: dict):
    """Returns (exit_code, lines_to_print)."""
    out = []
    scores = payload.get("scores")
    if not isinstance(scores, dict):
        return 2, ["[eval-score] judge output has no `scores` object"]

    if sum(weights.values()) != 100:
        return 2, [f"[eval-score] rubric weights sum to {sum(weights.values())}, not 100"]

    missing = sorted(set(weights) - set(scores))
    extra = sorted(set(scores) - set(weights))
    if missing:
        out.append(f"[eval-score] judge did not score: {', '.join(missing)}")
    if extra:
        out.append(f"[eval-score] judge scored dimensions not in the rubric: {', '.join(extra)}")
    if missing or extra:
        return 2, out

    for k, v in scores.items():
        if not isinstance(v, (int, float)) or not 0 <= v <= 10:
            return 2, [f"[eval-score] {k}={v!r} is not a score in 0..10"]

    computed = sum(scores[k] * w for k, w in weights.items()) / 100
    claimed = payload.get("weighted_total")
    if claimed is not None and abs(float(claimed) - computed) > TOLERANCE:
        return 2, [
            f"[eval-score] weighted_total does not follow from the scores: "
            f"judge said {claimed}, the rubric's weights give {computed:.2f}"
        ]

    out.append(f"[eval-score] weighted total {computed:.2f}")
    if threshold is not None and computed < threshold:
        weakest = sorted(scores.items(), key=lambda kv: kv[1])[:3]
        out.append(f"[eval-score] BELOW THRESHOLD {threshold}. Weakest: " +
                   ", ".join(f"{k}={v}" for k, v in weakest))
        return 1, out
    return 0, out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--rubric", required=True, type=Path)
    ap.add_argument("--scores", required=True, help="path to the judge's JSON, or - for stdin")
    args = ap.parse_args()

    if not args.rubric.exists():
        print(f"[eval-score] rubric not found: {args.rubric}", file=sys.stderr)
        return 2

    weights, threshold = parse_rubric(args.rubric.read_text(encoding="utf-8"))
    if not weights:
        print(f"[eval-score] no `### Name (weight N%)` dimensions in {args.rubric.name}",
              file=sys.stderr)
        return 2

    raw = sys.stdin.read() if args.scores == "-" else Path(args.scores).read_text(encoding="utf-8")
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"[eval-score] judge output is not valid JSON: {e}", file=sys.stderr)
        return 2

    code, lines = verify(weights, threshold, payload)
    for line in lines:
        print(line, file=sys.stderr)
    if code == 0:
        # The number the approval marker should carry.
        print(f"{sum(payload['scores'][k] * w for k, w in weights.items()) / 100:.2f}")
    return code


if __name__ == "__main__":
    sys.exit(main())
