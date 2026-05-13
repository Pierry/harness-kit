#!/usr/bin/env python3
"""Pipeline state manager for harness-kit.

Tracks the active feature, its pipeline shape (which stages will run), and
each stage's state (pending|drafting|approved). Stored at
.claude/.pipeline-state.json relative to repo root.

Subcommands:
  init <feature_id> <stage,stage,...>   create state, set pipeline shape
  intent <kind>                         record last slash invocation intent
                                        (sse-run, pm-run, full-run, sse-plan,
                                         sse-dev, sse-test, sse-pr, pm-prd,
                                         pm-prp, pipeline-continue)
  set-feature <feature_id>              attach feature_id (if not yet known)
  set-stage <stage> <state>             pending|drafting|approved
  detect-from-file <abs_path>           infer stage+state from output file
                                        path; auto-init pipeline if needed
  read                                  print state JSON
  render                                print one-line status bar
  next                                  print next pending stage command
  clear                                 remove state file
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

STATE_FILE = Path(".claude/.pipeline-state.json")

PM_STAGES = ("prd", "prp")
SSE_STAGES = ("plan", "dev", "test", "pr")
ALL_STAGES = PM_STAGES + SSE_STAGES

INTENT_TO_PIPELINE = {
    "pm-run": list(PM_STAGES),
    "sse-run": list(SSE_STAGES),
    "full-run": list(ALL_STAGES),
    "pm-prd": ["prd"],
    "pm-prp": ["prp"],
    "sse-plan": ["plan"],
    "sse-dev": ["dev"],
    "sse-test": ["test"],
    "sse-pr": ["pr"],
}

STAGE_TO_COMMAND = {
    "prd": "/product-manager:prd",
    "prp": "/product-manager:prp",
    "plan": "/sse:plan",
    "dev": "/sse:dev",
    "test": "/sse:test",
    "pr": "/sse:pr",
}

STAGE_TO_OUTPUT_DIR = {
    "prd": ".claude/plugins/product-manager/outputs/prd",
    "prp": ".claude/plugins/product-manager/outputs/prp",
    "plan": ".claude/plugins/staff-software-engineer/outputs/plan",
    "dev": ".claude/plugins/staff-software-engineer/outputs/dev",
    "test": ".claude/plugins/staff-software-engineer/outputs/test",
    "pr": ".claude/plugins/staff-software-engineer/outputs/pr",
}


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_state():
    if not STATE_FILE.exists():
        return None
    try:
        return json.loads(STATE_FILE.read_text())
    except (json.JSONDecodeError, OSError):
        return None


def save_state(state):
    state["updated_at"] = now_iso()
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2) + "\n")


def init_state(feature_id, pipeline):
    state = {
        "feature_id": feature_id,
        "pipeline": pipeline,
        "stages": {s: "pending" for s in pipeline},
        "current": pipeline[0] if pipeline else None,
        "intent": None,
        "started_at": now_iso(),
        "updated_at": now_iso(),
    }
    save_state(state)
    return state


def merge_pipeline(state, new_stages):
    """Extend pipeline with stages not already present, preserving order."""
    pipeline = state.get("pipeline", [])
    stages = state.get("stages", {})
    changed = False
    for s in new_stages:
        if s not in pipeline:
            pipeline.append(s)
            stages[s] = "pending"
            changed = True
    if changed:
        # Reorder by canonical sequence
        pipeline.sort(key=lambda s: ALL_STAGES.index(s))
        state["pipeline"] = pipeline
        state["stages"] = stages
    return state


def recompute_current(state):
    pipeline = state.get("pipeline", [])
    stages = state.get("stages", {})
    for s in pipeline:
        if stages.get(s) != "approved":
            state["current"] = s
            return state
    state["current"] = None
    return state


def slug(feature_id):
    if not feature_id:
        return ""
    parts = feature_id.split("-")
    if len(parts) > 3 and parts[0].isdigit() and len(parts[0]) == 4:
        return "-".join(parts[3:])
    return feature_id


def render_line():
    state = load_state()
    if not state or not state.get("pipeline"):
        return "idle · /product-manager:run · /sse:run · /pipeline:continue"

    fid = state.get("feature_id")
    name = slug(fid) if fid else f"starting {state.get('intent') or '?'}"

    current = state.get("current")
    pipeline = state["pipeline"]
    stages = state.get("stages", {})

    if current is None:
        return f"{name} · complete ({'/'.join(pipeline)})"

    # Find prev approved
    prev = None
    for s in pipeline:
        if s == current:
            break
        if stages.get(s) == "approved":
            prev = s

    cur_state = stages.get(current, "pending")
    next_cmd = STAGE_TO_COMMAND.get(current, "?")

    shape = "+".join(pipeline)

    # No work started yet: show full menu instead of locking to next stage
    no_work_started = (
        not fid
        and not prev
        and all(stages.get(s) == "pending" for s in pipeline)
    )
    if no_work_started:
        return f"{name} [{shape}] · /product-manager:run · /sse:run · /pipeline:continue · /pipeline:reset"

    if prev:
        return f"{name} [{shape}] · {prev} approved · {current} {cur_state} · next {next_cmd}"
    return f"{name} [{shape}] · {current} {cur_state} · next {next_cmd}"


def cmd_init(args):
    if len(args) < 2:
        print("usage: pipeline.py init <feature_id> <stage,stage,...>", file=sys.stderr)
        return 1
    fid = args[0]
    pipeline = [s for s in args[1].split(",") if s in ALL_STAGES]
    if not pipeline:
        print("no valid stages", file=sys.stderr)
        return 1
    init_state(fid, pipeline)
    return 0


def cmd_intent(args):
    if not args:
        print("usage: pipeline.py intent <kind>", file=sys.stderr)
        return 1
    kind = args[0]

    if kind == "pipeline-continue":
        # Don't mutate pipeline; just record intent
        state = load_state() or {}
        state["intent"] = kind
        if state.get("pipeline"):
            save_state(state)
        return 0

    new_stages = INTENT_TO_PIPELINE.get(kind)
    if not new_stages:
        print(f"unknown intent: {kind}", file=sys.stderr)
        return 1

    state = load_state()
    if not state:
        state = {
            "feature_id": None,
            "pipeline": list(new_stages),
            "stages": {s: "pending" for s in new_stages},
            "current": new_stages[0],
            "intent": kind,
            "started_at": now_iso(),
            "updated_at": now_iso(),
        }
        save_state(state)
        return 0

    # Existing state: extend pipeline with new stages
    state["intent"] = kind
    merge_pipeline(state, new_stages)
    recompute_current(state)
    save_state(state)
    return 0


def cmd_set_feature(args):
    if not args:
        print("usage: pipeline.py set-feature <feature_id>", file=sys.stderr)
        return 1
    state = load_state()
    if not state:
        print("no state file", file=sys.stderr)
        return 1
    state["feature_id"] = args[0]
    save_state(state)
    return 0


def cmd_set_stage(args):
    if len(args) < 2:
        print("usage: pipeline.py set-stage <stage> <pending|drafting|approved>", file=sys.stderr)
        return 1
    stage, st = args[0], args[1]
    if stage not in ALL_STAGES:
        print(f"unknown stage: {stage}", file=sys.stderr)
        return 1
    if st not in ("pending", "drafting", "approved"):
        print(f"unknown state: {st}", file=sys.stderr)
        return 1
    state = load_state()
    if not state:
        # Lazy init with this single stage
        state = {
            "feature_id": None,
            "pipeline": [stage],
            "stages": {stage: st},
            "current": stage,
            "intent": None,
            "started_at": now_iso(),
            "updated_at": now_iso(),
        }
    else:
        if stage not in state["pipeline"]:
            merge_pipeline(state, [stage])
        state["stages"][stage] = st
    recompute_current(state)
    save_state(state)
    return 0


def cmd_detect_from_file(args):
    if not args:
        print("usage: pipeline.py detect-from-file <abs_path>", file=sys.stderr)
        return 1
    path = args[0]
    stage = None
    for s, d in STAGE_TO_OUTPUT_DIR.items():
        if d in path and path.endswith(".md"):
            stage = s
            break
    if not stage:
        return 0  # not a tracked path, no-op

    fid = os.path.basename(path)[:-3]  # strip .md

    # Determine state by file contents
    file_state = "drafting"
    try:
        with open(path) as f:
            if "<!-- approved:" in f.read():
                file_state = "approved"
    except OSError:
        pass

    state = load_state()
    if not state:
        state = init_state(fid, [stage])
    else:
        if not state.get("feature_id"):
            state["feature_id"] = fid
        merge_pipeline(state, [stage])
        state["stages"][stage] = file_state
        recompute_current(state)
    save_state(state)
    return 0


def cmd_read(_args):
    state = load_state()
    print(json.dumps(state or {}, indent=2))
    return 0


def cmd_render(_args):
    print(render_line())
    return 0


def cmd_next(_args):
    state = load_state()
    if not state or not state.get("current"):
        return 1
    print(STAGE_TO_COMMAND.get(state["current"], ""))
    return 0


def cmd_clear(_args):
    if STATE_FILE.exists():
        STATE_FILE.unlink()
    return 0


COMMANDS = {
    "init": cmd_init,
    "intent": cmd_intent,
    "set-feature": cmd_set_feature,
    "set-stage": cmd_set_stage,
    "detect-from-file": cmd_detect_from_file,
    "read": cmd_read,
    "render": cmd_render,
    "next": cmd_next,
    "clear": cmd_clear,
}


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print(__doc__, file=sys.stderr)
        return 2
    return COMMANDS[sys.argv[1]](sys.argv[2:])


if __name__ == "__main__":
    sys.exit(main())
