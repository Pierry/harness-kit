#!/usr/bin/env python3
"""Live activity tracker for the status bar.

Writes the current sensor/eval/guide being touched to .claude/.activity so
status-line.sh can surface it. Auto-expires after 60s to avoid stale state
if a hook crashes before clearing.

Subcommands:
  set <kind> <name>   record kind+name (kind: sensor|eval|guide)
  clear               remove activity file
  read                print one-line "kind: name" (or empty if stale/absent)
"""

import json
import sys
import time
from pathlib import Path

ACTIVITY_FILE = Path(".claude/.activity")
# Durable, append-only log of every sensor/eval/guide the agent actually reads,
# with a timestamp. The cockpit correlates each entry against a stage's marker
# window to show the real per-run set of sensors/evals/guides used. Capped so it
# cannot grow without bound.
LOG_FILE = Path(".claude/runtime/outputs/.activity-log.jsonl")
LOG_CAP = 2000
TTL_SECONDS = 60


def _append_log(entry: dict):
    try:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with LOG_FILE.open("a") as f:
            f.write(json.dumps(entry) + "\n")
        # Trim to the last LOG_CAP lines when it drifts past 1.5x the cap.
        lines = LOG_FILE.read_text().splitlines()
        if len(lines) > int(LOG_CAP * 1.5):
            LOG_FILE.write_text("\n".join(lines[-LOG_CAP:]) + "\n")
    except OSError:
        pass


def cmd_set(args):
    if len(args) < 2:
        return 1
    kind, name = args[0], args[1]
    if kind not in ("sensor", "eval", "guide"):
        return 1
    ACTIVITY_FILE.parent.mkdir(parents=True, exist_ok=True)
    ts = time.time()
    ACTIVITY_FILE.write_text(json.dumps({"kind": kind, "name": name, "ts": ts}))
    _append_log({"kind": kind, "name": name, "ts": ts})
    return 0


def cmd_clear(_args):
    if ACTIVITY_FILE.exists():
        ACTIVITY_FILE.unlink()
    return 0


def cmd_read(_args):
    if not ACTIVITY_FILE.exists():
        return 0
    try:
        d = json.loads(ACTIVITY_FILE.read_text())
    except (json.JSONDecodeError, OSError):
        return 0
    if time.time() - d.get("ts", 0) > TTL_SECONDS:
        try:
            ACTIVITY_FILE.unlink()
        except OSError:
            pass
        return 0
    print(f"{d.get('kind', '?')}: {d.get('name', '?')}")
    return 0


COMMANDS = {"set": cmd_set, "clear": cmd_clear, "read": cmd_read}


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print(__doc__, file=sys.stderr)
        return 2
    return COMMANDS[sys.argv[1]](sys.argv[2:])


if __name__ == "__main__":
    sys.exit(main())
