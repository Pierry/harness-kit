#!/bin/bash
# Fires after Edit tool appends the approval marker on a PRP.
# Closes validate phase, runs token accounting, finalizes handoff.
#
# Registered in .claude/settings.json under PostToolUse > Edit.

set -euo pipefail

FILE_PATH="${CLAUDE_TOOL_FILE_PATH:-}"
AGENT_DIR=".claude/agents/product-manager"
OUTPUTS_DIR=".claude/runtime/outputs/pm"
SCRIPTS_DIR=".claude/runtime/scripts/product-manager"

case "$FILE_PATH" in
  *.claude/runtime/outputs/pm/prp/*.md) ;;
  *) exit 0 ;;
esac

if ! grep -q "<!-- approved:" "$FILE_PATH"; then
  exit 0
fi

if grep -q "<!-- published:" "$FILE_PATH"; then
  exit 0
fi

echo "[hook] PRP approved, finalizing handoff for $(basename "$FILE_PATH")" >&2

FEATURE_ID="$(basename "$FILE_PATH" .md)"
MARKERS_DIR="$OUTPUTS_DIR/.markers"
mkdir -p "$MARKERS_DIR"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ -f "$MARKERS_DIR/${FEATURE_ID}.prp-validate.start" ]; then
  printf '{"timestamp":"%s"}\n' "$NOW" > "$MARKERS_DIR/${FEATURE_ID}.prp-validate.end"
fi

python3 "$SCRIPTS_DIR/token-phase.py" \
  --feature-id "$FEATURE_ID" \
  --phase "prp-generate" \
  --plugin-dir "$OUTPUTS_DIR" \
  --prp-path "$FILE_PATH" >&2 || true

python3 "$SCRIPTS_DIR/token-phase.py" \
  --feature-id "$FEATURE_ID" \
  --phase "prp-validate" \
  --plugin-dir "$OUTPUTS_DIR" \
  --prp-path "$FILE_PATH" >&2 || true

if [ -n "${JIRA_USERNAME:-}" ] && [ -n "${JIRA_API_TOKEN:-}" ]; then
  python3 "$SCRIPTS_DIR/confluence-publish.py" \
    --artifact "$FILE_PATH" \
    --kind prp >&2 || true
fi

# Inline tokens summary
TOKENS_FILE="$OUTPUTS_DIR/tokens/${FEATURE_ID}.json"
if [ -f "$TOKENS_FILE" ]; then
  TOKENS_LINE=$(python3 -c "
import json,sys
with open('$TOKENS_FILE') as f:
    d=json.load(f)
t=d.get('totals',{})
print(f'<!-- tokens: outputs/tokens/${FEATURE_ID}.json in={t.get(\"input\",0)} out={t.get(\"output\",0)} cache_r={t.get(\"cache_read\",0)} -->')
")
  printf '\n%s\n' "$TOKENS_LINE" >> "$FILE_PATH"
fi

printf '\n<!-- published: %s -->\n' "$NOW" >> "$FILE_PATH"

echo "[hook] PRP handoff complete" >&2
exit 0
