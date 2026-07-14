#!/bin/sh
# SessionStart hook.
# 1. If current branch has a MERGED/CLOSED PR and pipeline state looks stale
#    (no feature_id), clear state, the work shipped, nothing to resume.
# 2. Otherwise, if a pipeline state exists with an incomplete pipeline,
#    print a resume hint.

set -e

PIPELINE_PY=".claude/scripts/pipeline.py"
STATE_FILE=".claude/.pipeline-state.json"
[ -x "$PIPELINE_PY" ] || exit 0
[ -f "$STATE_FILE" ] || exit 0

# Stale-state auto-clear: branch has terminal PR + no feature_id recorded.
if command -v gh >/dev/null 2>&1 && command -v python3 >/dev/null 2>&1; then
  FID="$(python3 -c 'import json,sys
try:
    s=json.load(open(".claude/.pipeline-state.json"))
    print(s.get("feature_id") or "")
except Exception:
    pass' 2>/dev/null || true)"
  if [ -z "$FID" ]; then
    PR_STATE="$(gh pr view --json state -q .state 2>/dev/null || true)"
    PR_NUM="$(gh pr view --json number -q .number 2>/dev/null || true)"
    case "$PR_STATE" in
      MERGED|CLOSED)
        python3 "$PIPELINE_PY" clear >/dev/null 2>&1 || true
        printf 'previous feature shipped (PR #%s %s). pipeline state cleared.\nstart next with /product-manager:run or /sse:run\n' "$PR_NUM" "$PR_STATE"
        exit 0
        ;;
    esac
  fi
fi

# Reconcile state with artifacts on disk (repairs a state that lagged behind a
# run). Done after the shipped-clear check so a merged feature still clears.
python3 "$PIPELINE_PY" sync >/dev/null 2>&1 || true

CURRENT="$(python3 "$PIPELINE_PY" next 2>/dev/null || true)"
[ -z "$CURRENT" ] && exit 0

LINE="$(python3 "$PIPELINE_PY" render 2>/dev/null || true)"
printf 'pipeline resume available: %s\nrun /pipeline:continue or /pipeline:reset to abandon\n' "$LINE"
exit 0
