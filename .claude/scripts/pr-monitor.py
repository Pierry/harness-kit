#!/usr/bin/env python3
"""PR-merge monitor state for harness-kit.

Tracks the PR being watched and the polling cadence. Stored at
.claude/.pr-monitor-state.json relative to repo root.

Polling schedule: 3 -> 6 -> 12 -> 24 -> 30 minutes (cap). Bumps to next rung
after 5 attempts at the current interval. Stays at 30 once reached.

Subcommands:
  init <pr_number> <pr_url> <branch>   create state, interval=3min
  bump                                  +1 attempt, escalate if 5 hit;
                                        prints next interval in seconds
  read                                  print state JSON
  clear                                 remove state file
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

STATE_FILE = Path(".claude/.pr-monitor-state.json")
START_MIN = 3
CAP_MIN = 30
ATTEMPTS_PER_RUNG = 5


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load():
    if not STATE_FILE.exists():
        return None
    try:
        return json.loads(STATE_FILE.read_text())
    except (json.JSONDecodeError, OSError):
        return None


def save(state):
    state["updated_at"] = now_iso()
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2) + "\n")


def cmd_init(args):
    if len(args) < 3:
        print("usage: pr-monitor.py init <pr_number> <pr_url> <branch>", file=sys.stderr)
        return 1
    state = {
        "pr_number": int(args[0]),
        "pr_url": args[1],
        "branch": args[2],
        "current_interval_min": START_MIN,
        "attempts_at_interval": 0,
        "total_attempts": 0,
        "started_at": now_iso(),
        "updated_at": now_iso(),
    }
    save(state)
    print(START_MIN * 60)
    return 0


def cmd_bump(_args):
    state = load()
    if not state:
        print("no state", file=sys.stderr)
        return 1
    state["attempts_at_interval"] += 1
    state["total_attempts"] += 1
    if (
        state["attempts_at_interval"] >= ATTEMPTS_PER_RUNG
        and state["current_interval_min"] < CAP_MIN
    ):
        state["current_interval_min"] = min(state["current_interval_min"] * 2, CAP_MIN)
        state["attempts_at_interval"] = 0
    save(state)
    print(state["current_interval_min"] * 60)
    return 0


def cmd_read(_args):
    state = load()
    print(json.dumps(state or {}, indent=2))
    return 0


def cmd_clear(_args):
    if STATE_FILE.exists():
        STATE_FILE.unlink()
    return 0


COMMANDS = {
    "init": cmd_init,
    "bump": cmd_bump,
    "read": cmd_read,
    "clear": cmd_clear,
}


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print(__doc__, file=sys.stderr)
        return 2
    return COMMANDS[sys.argv[1]](sys.argv[2:])


if __name__ == "__main__":
    sys.exit(main())
