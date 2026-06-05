#!/bin/sh
# UserPromptSubmit hook. Detects pipeline slash commands in the user's input
# and records intent in the pipeline state file.
#
# Reads JSON from stdin (Claude Code hook payload). Looks at the prompt text
# and matches known commands. Does not block submission.

set -e

PROMPT="$(python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("prompt","") or d.get("user_prompt",""))' 2>/dev/null || echo "")"

[ -z "$PROMPT" ] && exit 0

PIPELINE_PY=".claude/scripts/pipeline.py"
[ -x "$PIPELINE_PY" ] || exit 0

# Match leading slash commands. Order matters: more specific first.
case "$PROMPT" in
  /golden-path*)         python3 "$PIPELINE_PY" intent full-run >/dev/null 2>&1 ;;
  /product-manager:run*) python3 "$PIPELINE_PY" intent pm-run >/dev/null 2>&1 ;;
  /product-manager:prd*) python3 "$PIPELINE_PY" intent pm-prd >/dev/null 2>&1 ;;
  /product-manager:prp*) python3 "$PIPELINE_PY" intent pm-prp >/dev/null 2>&1 ;;
  /sse:run*)             python3 "$PIPELINE_PY" intent sse-run >/dev/null 2>&1 ;;
  /sse:plan*)            python3 "$PIPELINE_PY" intent sse-plan >/dev/null 2>&1 ;;
  /sse:dev*)             python3 "$PIPELINE_PY" intent sse-dev >/dev/null 2>&1 ;;
  /sse:test*)            python3 "$PIPELINE_PY" intent sse-test >/dev/null 2>&1 ;;
  /sse:pr*)              python3 "$PIPELINE_PY" intent sse-pr >/dev/null 2>&1 ;;
  /pipeline:continue*)   python3 "$PIPELINE_PY" intent pipeline-continue >/dev/null 2>&1 ;;
  /pipeline:reset*)      python3 "$PIPELINE_PY" clear >/dev/null 2>&1 ;;
esac

exit 0
