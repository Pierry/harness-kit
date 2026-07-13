#!/bin/bash
# Generic SSE post-eval hook. Handles plan/dev/test/pr phases:
# - detects approved marker
# - closes validate.end marker
# - runs token-phase.py for both generate and validate phases
# - appends published marker + inline tokens reference
#
# Registered in .claude/settings.json under PostToolUse > Edit.

set -euo pipefail

FILE_PATH="${CLAUDE_TOOL_FILE_PATH:-}"
AGENT_DIR=".claude/agents/staff-software-engineer"
OUTPUTS_DIR=".claude/runtime/outputs/sse"
SCRIPTS_DIR=".claude/runtime/scripts/staff-software-engineer"

PHASE=""
case "$FILE_PATH" in
  *.claude/runtime/outputs/sse/plan/*.md) PHASE=plan ;;
  *.claude/runtime/outputs/sse/dev/*.md)  PHASE=dev  ;;
  *.claude/runtime/outputs/sse/test/*.md) PHASE=test ;;
  *.claude/runtime/outputs/sse/pr/*.md)   PHASE=pr   ;;
  *) exit 0 ;;
esac

if ! grep -q "<!-- approved:" "$FILE_PATH"; then
  exit 0
fi

if grep -q "<!-- published:" "$FILE_PATH"; then
  exit 0
fi

FEATURE_ID="$(basename "$FILE_PATH" .md)"
MARKERS_DIR="$OUTPUTS_DIR/.markers"
mkdir -p "$MARKERS_DIR"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ -f "$MARKERS_DIR/${FEATURE_ID}.${PHASE}-validate.start" ]; then
  printf '{"timestamp":"%s"}\n' "$NOW" > "$MARKERS_DIR/${FEATURE_ID}.${PHASE}-validate.end"
fi

python3 "$SCRIPTS_DIR/token-phase.py" \
  --feature-id "$FEATURE_ID" \
  --phase "${PHASE}-generate" \
  --plugin-dir "$OUTPUTS_DIR" >&2 || true

python3 "$SCRIPTS_DIR/token-phase.py" \
  --feature-id "$FEATURE_ID" \
  --phase "${PHASE}-validate" \
  --plugin-dir "$OUTPUTS_DIR" >&2 || true

TOKENS_FILE="$OUTPUTS_DIR/tokens/${FEATURE_ID}.json"
if [ -f "$TOKENS_FILE" ]; then
  TOKENS_LINE=$(python3 -c "
import json
with open('$TOKENS_FILE') as f:
    d=json.load(f)
t=d.get('totals',{})
print(f'<!-- tokens: outputs/tokens/${FEATURE_ID}.json in={t.get(\"input\",0)} out={t.get(\"output\",0)} cache_r={t.get(\"cache_read\",0)} -->')
")
  printf '\n%s\n' "$TOKENS_LINE" >> "$FILE_PATH"
fi

# Persist phase quality (score, gaps, sensors) to the cumulative log
python3 .claude/scripts/phase-log.py \
  --feature-id "$FEATURE_ID" \
  --stage "$PHASE" \
  --artifact "$FILE_PATH" \
  --tokens "$TOKENS_FILE" >&2 || true

printf '\n<!-- published: %s -->\n' "$NOW" >> "$FILE_PATH"
echo "[hook] ${PHASE} approved + token accounting done" >&2
exit 0
