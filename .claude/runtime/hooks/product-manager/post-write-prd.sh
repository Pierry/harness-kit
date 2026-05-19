#!/bin/bash
# Fires after Write tool saves a file. If the file is a PRD draft, runs the
# deterministic sensor pipeline and writes phase markers for token accounting.
#
# Registered in .claude/settings.json under PostToolUse > Write.

set -euo pipefail

FILE_PATH="${CLAUDE_TOOL_FILE_PATH:-}"
AGENT_DIR=".claude/agents/product-manager"
OUTPUTS_DIR=".claude/runtime/outputs/pm"
SCRIPTS_DIR=".claude/runtime/scripts/product-manager"

case "$FILE_PATH" in
  *.claude/runtime/outputs/pm/prd/*.md) ;;
  *) exit 0 ;;
esac

# Skip if file already approved (avoid loops)
if grep -q "<!-- approved:" "$FILE_PATH" 2>/dev/null; then
  exit 0
fi

echo "[hook] Running PRD sensors on $(basename "$FILE_PATH")" >&2

FAILURES=()
for sensor in "$AGENT_DIR"/sensors/prd-*.md; do
  [ -f "$sensor" ] || continue
  if ! python3 "$SCRIPTS_DIR/sensor-runner.py" \
        --sensor "$sensor" \
        --artifact "$FILE_PATH" >&2; then
    FAILURES+=("$(basename "$sensor")")
  fi
done

if [ ${#FAILURES[@]} -gt 0 ]; then
  echo "" >&2
  echo "[hook] PRD sensor failures: ${FAILURES[*]}" >&2
  echo "[hook] Read the messages above and regenerate the failed sections." >&2
  exit 2
fi

echo "[hook] PRD sensors passed" >&2

# Token phase markers: only on first save (no validate.start yet)
FEATURE_ID="$(basename "$FILE_PATH" .md)"
MARKERS_DIR="$OUTPUTS_DIR/.markers"
mkdir -p "$MARKERS_DIR"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ ! -f "$MARKERS_DIR/${FEATURE_ID}.prd-validate.start" ]; then
  if [ -f "$MARKERS_DIR/${FEATURE_ID}.prd-generate.start" ]; then
    printf '{"timestamp":"%s"}\n' "$NOW" > "$MARKERS_DIR/${FEATURE_ID}.prd-generate.end"
    printf '{"timestamp":"%s","session_id":"%s"}\n' "$NOW" "${CLAUDE_SESSION_ID:-}" > "$MARKERS_DIR/${FEATURE_ID}.prd-validate.start"
  fi
fi

exit 0
