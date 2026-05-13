#!/bin/bash
# After Write to outputs/plan/, run sensors and write phase markers.

set -euo pipefail

FILE_PATH="${CLAUDE_TOOL_FILE_PATH:-}"
PLUGIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"

case "$FILE_PATH" in
  *.claude/plugins/staff-software-engineer/outputs/plan/*.md) ;;
  *) exit 0 ;;
esac

if grep -q "<!-- approved:" "$FILE_PATH" 2>/dev/null; then
  exit 0
fi

echo "[hook] Running plan sensors on $(basename "$FILE_PATH")" >&2

FAILURES=()
for sensor in "$PLUGIN_DIR"/sensors/plan-*.md; do
  [ -f "$sensor" ] || continue
  if ! python3 "$PLUGIN_DIR/scripts/sensor-runner.py" \
        --sensor "$sensor" \
        --artifact "$FILE_PATH" >&2; then
    FAILURES+=("$(basename "$sensor")")
  fi
done

if [ ${#FAILURES[@]} -gt 0 ]; then
  echo "[hook] Plan sensor failures: ${FAILURES[*]}" >&2
  exit 2
fi

echo "[hook] Plan sensors passed" >&2

FEATURE_ID="$(basename "$FILE_PATH" .md)"
MARKERS_DIR="$PLUGIN_DIR/outputs/.markers"
mkdir -p "$MARKERS_DIR"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ ! -f "$MARKERS_DIR/${FEATURE_ID}.plan-validate.start" ]; then
  if [ -f "$MARKERS_DIR/${FEATURE_ID}.plan-generate.start" ]; then
    printf '{"timestamp":"%s"}\n' "$NOW" > "$MARKERS_DIR/${FEATURE_ID}.plan-generate.end"
    printf '{"timestamp":"%s","session_id":"%s"}\n' "$NOW" "${CLAUDE_SESSION_ID:-}" > "$MARKERS_DIR/${FEATURE_ID}.plan-validate.start"
  fi
fi

exit 0
