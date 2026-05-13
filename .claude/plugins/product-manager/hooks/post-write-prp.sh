#!/bin/bash
# Fires after Write tool saves a file. If the file is a PRP draft, runs
# structural sensors plus link validation and writes phase markers.
#
# Registered in .claude/settings.json under PostToolUse > Write.

set -euo pipefail

FILE_PATH="${CLAUDE_TOOL_FILE_PATH:-}"
PLUGIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"

case "$FILE_PATH" in
  *.claude/plugins/product-manager/outputs/prp/*.md) ;;
  *) exit 0 ;;
esac

if grep -q "<!-- approved:" "$FILE_PATH" 2>/dev/null; then
  exit 0
fi

echo "[hook] Running PRP sensors on $(basename "$FILE_PATH")" >&2

FAILURES=()
for sensor in "$PLUGIN_DIR"/sensors/prp-*.md; do
  [ -f "$sensor" ] || continue
  if ! python3 "$PLUGIN_DIR/scripts/sensor-runner.py" \
        --sensor "$sensor" \
        --artifact "$FILE_PATH" >&2; then
    FAILURES+=("$(basename "$sensor")")
  fi
done

if ! python3 "$PLUGIN_DIR/scripts/link-validator.py" \
      --artifact "$FILE_PATH" \
      --repo-root "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" >&2; then
  FAILURES+=("link-validator")
fi

if [ ${#FAILURES[@]} -gt 0 ]; then
  echo "" >&2
  echo "[hook] PRP sensor failures: ${FAILURES[*]}" >&2
  echo "[hook] Read the messages above and regenerate the failed sections." >&2
  exit 2
fi

echo "[hook] PRP sensors passed" >&2

# Token phase markers
FEATURE_ID="$(basename "$FILE_PATH" .md)"
MARKERS_DIR="$PLUGIN_DIR/outputs/.markers"
mkdir -p "$MARKERS_DIR"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ ! -f "$MARKERS_DIR/${FEATURE_ID}.prp-validate.start" ]; then
  if [ -f "$MARKERS_DIR/${FEATURE_ID}.prp-generate.start" ]; then
    printf '{"timestamp":"%s"}\n' "$NOW" > "$MARKERS_DIR/${FEATURE_ID}.prp-generate.end"
    printf '{"timestamp":"%s","session_id":"%s"}\n' "$NOW" "${CLAUDE_SESSION_ID:-}" > "$MARKERS_DIR/${FEATURE_ID}.prp-validate.start"
  fi
fi

exit 0
