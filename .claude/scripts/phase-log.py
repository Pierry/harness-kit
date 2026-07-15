#!/usr/bin/env python3
"""Phase quality logger for harness-kit.

Appends one entry per completed phase to a cumulative JSON log so the eval
score, gap count, and sensor pass/fail of every stage are persisted across
runs instead of being lost in chat. Feed the log to the upload page
(docs/quality/phase-report.html) to see failure rate and score trend per stage.

Deterministic and free: harvests only signal the harness already computes.
  - score: parsed from the artifact's `<!-- approved: DATE score=N -->` marker
  - gaps:  count of `NOT FOUND - NEEDS REVIEW` markers left in the artifact
  - sensors: the stage sensors re-run against the artifact (best-effort)

Best-effort by contract: any failure here is swallowed so it never breaks the
post-eval hook that calls it.

Usage:
  phase-log.py --feature-id <id> --stage <stage> --artifact <path.md> \
      [--tokens <tokens.json>] [--log <phase-log.json>]
"""
import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

# stage -> (agent bucket, [sensor names]). Agent bucket picks the sensor dir
# and the sensor-runner. Names resolve to <sensor_dir>/<name>.md.
STAGE_SENSORS = {
    "prd":  ("pm",  ["prd-structure", "prd-acceptance-criteria"]),
    "prp":  ("pm",  ["prp-structure", "prp-context-quality", "prp-links"]),
    "plan": ("sse", ["plan-structure"]),
    "dev":  ("sse", ["dev-structure", "code-conventions"]),
    "test": ("sse", ["test-structure", "test-coverage"]),
    "pr":   ("sse", ["pr-structure"]),
}

BUCKET = {
    "pm": {
        "sensor_dir": ".claude/agents/product-manager/sensors",
        "runner": ".claude/runtime/scripts/product-manager/sensor-runner.py",
    },
    "sse": {
        "sensor_dir": ".claude/agents/staff-software-engineer/sensors",
        "runner": ".claude/runtime/scripts/staff-software-engineer/sensor-runner.py",
    },
}

DEFAULT_LOG = ".claude/runtime/outputs/quality/phase-log.json"
APPROVED_RE = re.compile(r"<!--\s*approved:\s*(\S+)\s+score=([0-9]+(?:\.[0-9]+)?)")
GAP_MARKER = "NOT FOUND - NEEDS REVIEW"


def parse_score(text):
    """Return (score, approved_date) from the last approval marker, or (None, None)."""
    matches = APPROVED_RE.findall(text)
    if not matches:
        return None, None
    date, score = matches[-1]
    try:
        return float(score), date
    except ValueError:
        return None, date


def count_gaps(text):
    return text.count(GAP_MARKER)


def run_sensors(stage, artifact):
    """Re-run the stage sensors.

    `inferential` is its own bucket on purpose. These sensors are applied by a
    model, not machine-checked, so recording them as passed is a false green.
    This log used to do exactly that: code-conventions and test-coverage were
    piped through the runner, which returned 0 without checking anything, and
    every run recorded them as passed.
    """
    result = {"passed": [], "failed": [], "inferential": [], "skipped": []}
    entry = STAGE_SENSORS.get(stage)
    if not entry:
        return result
    bucket, names = entry
    cfg = BUCKET[bucket]
    runner = cfg["runner"]
    if not os.path.isfile(runner):
        result["skipped"] = list(names)
        return result
    for name in names:
        sensor = os.path.join(cfg["sensor_dir"], f"{name}.md")
        if not os.path.isfile(sensor):
            result["skipped"].append(name)
            continue
        try:
            proc = subprocess.run(
                ["python3", runner, "--sensor", sensor, "--artifact", artifact],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                timeout=60,
            )
            # 0 pass | 1 check failed | 2 broken sensor spec | 3 inferential
            if proc.returncode == 0:
                result["passed"].append(name)
            elif proc.returncode == 3:
                result["inferential"].append(name)
            else:
                result["failed"].append(name)
        except Exception:
            result["skipped"].append(name)
    return result


def read_tokens(path):
    if not path or not os.path.isfile(path):
        return None
    try:
        with open(path) as f:
            totals = json.load(f).get("totals", {})
        return {
            "input": totals.get("input", 0),
            "output": totals.get("output", 0),
            "cache_read": totals.get("cache_read", 0),
        }
    except Exception:
        return None


def derive_status(score, gaps, sensors):
    if sensors["failed"]:
        return "failed"
    if (score is not None and score < 7) or gaps > 0:
        return "degraded"
    return "ok"


def load_log(path):
    if os.path.isfile(path):
        try:
            with open(path) as f:
                data = json.load(f)
            if isinstance(data, dict) and isinstance(data.get("entries"), list):
                return data
        except Exception:
            pass
    return {"version": 1, "entries": []}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--feature-id", required=True)
    ap.add_argument("--stage", required=True)
    ap.add_argument("--artifact", required=True)
    ap.add_argument("--tokens", default=None)
    ap.add_argument("--log", default=DEFAULT_LOG)
    args = ap.parse_args()

    if not os.path.isfile(args.artifact):
        return 0

    with open(args.artifact, encoding="utf-8", errors="replace") as f:
        text = f.read()

    score, approved_date = parse_score(text)
    gaps = count_gaps(text)
    sensors = run_sensors(args.stage, args.artifact)
    tokens = read_tokens(args.tokens)
    status = derive_status(score, gaps, sensors)

    entry = {
        "ts": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "approved_date": approved_date,
        "feature_id": args.feature_id,
        "stage": args.stage,
        "score": score,
        "gaps": gaps,
        "sensors": sensors,
        "status": status,
        "tokens": tokens,
    }

    log = load_log(args.log)
    log["entries"].append(entry)
    os.makedirs(os.path.dirname(args.log), exist_ok=True)
    tmp = args.log + ".tmp"
    with open(tmp, "w") as f:
        json.dump(log, f, indent=2)
    os.replace(tmp, args.log)

    print(f"[phase-log] {args.stage} score={score} gaps={gaps} "
          f"status={status} -> {args.log}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:  # never break the calling hook
        print(f"[phase-log] non-fatal: {e}", file=sys.stderr)
        sys.exit(0)
