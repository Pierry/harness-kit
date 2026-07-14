#!/bin/bash
# Fires after Edit tool appends the approval marker. Detects the marker,
# closes the validate phase, runs token accounting, and triggers publish.
#
# Registered in .claude/settings.json under PostToolUse > Edit.

set -euo pipefail

# Claude Code passes tool details as JSON on stdin (tool_input.file_path).
# Fall back to the legacy env var for older hosts.
FILE_PATH="$(python3 -c 'import json,sys; ti=json.load(sys.stdin).get("tool_input",{}); print(ti.get("file_path") or ti.get("path") or "")' 2>/dev/null || true)"
[ -z "$FILE_PATH" ] && FILE_PATH="${CLAUDE_TOOL_FILE_PATH:-}"
AGENT_DIR=".claude/agents/product-manager"
OUTPUTS_DIR=".claude/runtime/outputs/pm"
SCRIPTS_DIR=".claude/runtime/scripts/product-manager"

case "$FILE_PATH" in
  *.claude/runtime/outputs/pm/prd/*.md) ;;
  *) exit 0 ;;
esac

if ! grep -q "<!-- approved:" "$FILE_PATH"; then
  exit 0
fi

if grep -q "<!-- published:" "$FILE_PATH"; then
  exit 0
fi

echo "[hook] PRD approved, publishing $(basename "$FILE_PATH")" >&2

FEATURE_ID="$(basename "$FILE_PATH" .md)"
MARKERS_DIR="$OUTPUTS_DIR/.markers"
mkdir -p "$MARKERS_DIR"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Close validate phase
if [ -f "$MARKERS_DIR/${FEATURE_ID}.prd-validate.start" ]; then
  printf '{"timestamp":"%s"}\n' "$NOW" > "$MARKERS_DIR/${FEATURE_ID}.prd-validate.end"
fi

# Token accounting for both phases
python3 "$SCRIPTS_DIR/token-phase.py" \
  --feature-id "$FEATURE_ID" \
  --phase "prd-generate" \
  --plugin-dir "$OUTPUTS_DIR" \
  --prd-path "$FILE_PATH" >&2 || true

python3 "$SCRIPTS_DIR/token-phase.py" \
  --feature-id "$FEATURE_ID" \
  --phase "prd-validate" \
  --plugin-dir "$OUTPUTS_DIR" \
  --prd-path "$FILE_PATH" >&2 || true

# Confluence (optional)
if [ -n "${JIRA_USERNAME:-}" ] && [ -n "${JIRA_API_TOKEN:-}" ]; then
  python3 "$SCRIPTS_DIR/confluence-publish.py" \
    --artifact "$FILE_PATH" \
    --kind prd >&2 || {
      echo "[hook] Confluence publish failed but local copy is saved" >&2
    }
else
  echo "[hook] Confluence creds not set (JIRA_USERNAME, JIRA_API_TOKEN). Local save only." >&2
fi

# Append published marker + inline tokens reference
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

python3 .claude/scripts/phase-log.py \
  --feature-id "$FEATURE_ID" \
  --stage prd \
  --artifact "$FILE_PATH" \
  --tokens "$TOKENS_FILE" >&2 || true

printf '\n<!-- published: %s -->\n' "$NOW" >> "$FILE_PATH"

echo "[hook] PRD published" >&2
exit 0
