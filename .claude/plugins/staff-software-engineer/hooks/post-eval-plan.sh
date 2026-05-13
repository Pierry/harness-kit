#!/bin/bash
# After Edit appends approval marker to plan, close phases, run token accounting.

set -euo pipefail

FILE_PATH="${CLAUDE_TOOL_FILE_PATH:-}"
PLUGIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"

case "$FILE_PATH" in
  *.claude/plugins/staff-software-engineer/outputs/plan/*.md) ;;
  *) exit 0 ;;
esac

if ! grep -q "<!-- approved:" "$FILE_PATH"; then
  exit 0
fi

if grep -q "<!-- published:" "$FILE_PATH"; then
  exit 0
fi

FEATURE_ID="$(basename "$FILE_PATH" .md)"
MARKERS_DIR="$PLUGIN_DIR/outputs/.markers"
mkdir -p "$MARKERS_DIR"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ -f "$MARKERS_DIR/${FEATURE_ID}.plan-validate.start" ]; then
  printf '{"timestamp":"%s"}\n' "$NOW" > "$MARKERS_DIR/${FEATURE_ID}.plan-validate.end"
fi

python3 "$PLUGIN_DIR/scripts/token-phase.py" \
  --feature-id "$FEATURE_ID" \
  --phase "plan-generate" \
  --plugin-dir "$PLUGIN_DIR" >&2 || true

python3 "$PLUGIN_DIR/scripts/token-phase.py" \
  --feature-id "$FEATURE_ID" \
  --phase "plan-validate" \
  --plugin-dir "$PLUGIN_DIR" >&2 || true

printf '\n<!-- published: %s -->\n' "$NOW" >> "$FILE_PATH"
echo "[hook] Plan approved + token accounting done" >&2
exit 0
