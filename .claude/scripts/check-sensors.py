#!/usr/bin/env python3
"""
Sensor contract checker.

Every sensor must be honest about how it is enforced:

  - it declares `Execution: computational` or `Execution: inferential`
  - a computational sensor wires up at least one check the runner understands

A computational sensor that parses to zero checks is the failure mode that
shipped here once: it returns 0 forever and reports green without ever looking
at the artifact. This is the guide-side counterpart to the runner's exit 2.

Run it locally before adding or editing a sensor:
  python3 .claude/scripts/check-sensors.py
  python3 .claude/scripts/check-sensors.py --list
"""

import argparse
import importlib.util
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
RUNNER = REPO / ".claude/runtime/scripts/product-manager/sensor-runner.py"

spec = importlib.util.spec_from_file_location("sensor_runner", RUNNER)
sr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sr)


def sensors():
    for d in sorted((REPO / ".claude/agents").glob("*/sensors")):
        for f in sorted(d.glob("*.md")):
            yield f


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true", help="print the ledger and exit 0")
    args = ap.parse_args()

    problems = []
    rows = []
    for s in sensors():
        md = s.read_text(encoding="utf-8")
        declared = "Execution:" in md
        execution = sr.execution_type(md)
        # run-sensors.sh dispatches these to a purpose-built executable rather
        # than to sensor-runner, so they legitimately parse to no markdown checks.
        dispatched = {"links": "link-validator.py", "maintainability": "maintainability.sh"}
        validator = next((v for k, v in dispatched.items() if k in s.name), None)
        checks = sr.parsed_checks(md)
        rel = s.relative_to(REPO / ".claude/agents")

        if not declared:
            problems.append(f"{rel}: no `Execution:` header (add computational or inferential)")
        if execution == sr.COMPUTATIONAL and not checks and not validator:
            problems.append(
                f"{rel}: Execution: computational but wires up no check the runner "
                f"understands, so it would report green without checking anything"
            )
        rows.append((str(rel), execution, validator or (", ".join(checks) or "-")))

    width = max(len(r[0]) for r in rows)
    for name, execution, checks in rows:
        print(f"{name:<{width}}  {execution:<13}  {checks}")

    if args.list:
        return 0
    if problems:
        print("\nsensor contract violations:", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        return 1
    print(f"\n{len(rows)} sensors, contract ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
