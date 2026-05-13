#!/bin/sh
# SessionStart hook. If a pipeline state exists with an incomplete pipeline,
# print a resume hint that the user can act on.

set -e

PIPELINE_PY=".claude/scripts/pipeline.py"
STATE_FILE=".claude/.pipeline-state.json"
[ -x "$PIPELINE_PY" ] || exit 0
[ -f "$STATE_FILE" ] || exit 0

CURRENT="$(python3 "$PIPELINE_PY" next 2>/dev/null || true)"
[ -z "$CURRENT" ] && exit 0

LINE="$(python3 "$PIPELINE_PY" render 2>/dev/null || true)"
printf 'pipeline resume available: %s\nrun /pipeline:continue or /pipeline:reset to abandon\n' "$LINE"
exit 0
