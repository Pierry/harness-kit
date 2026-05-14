#!/bin/bash
# Generic SSE post-write hook. Handles plan/dev/test/pr phases:
# - runs sensors matching sensors/{phase}-*.md (if any)
# - writes phase generate.end + validate.start markers
#
# Registered in .claude/settings.json under PostToolUse > Write.

set -euo pipefail

FILE_PATH="${CLAUDE_TOOL_FILE_PATH:-}"
PLUGIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"

PHASE=""
case "$FILE_PATH" in
  *.claude/plugins/staff-software-engineer/outputs/plan/*.md) PHASE=plan ;;
  *.claude/plugins/staff-software-engineer/outputs/dev/*.md)  PHASE=dev  ;;
  *.claude/plugins/staff-software-engineer/outputs/test/*.md) PHASE=test ;;
  *.claude/plugins/staff-software-engineer/outputs/pr/*.md)   PHASE=pr   ;;
  *) exit 0 ;;
esac

if grep -q "<!-- approved:" "$FILE_PATH" 2>/dev/null; then
  exit 0
fi

ACTIVITY="$(cd "$PLUGIN_DIR/../../.." && pwd)/.claude/scripts/activity.py"
set_activity() { [ -x "$ACTIVITY" ] && python3 "$ACTIVITY" set "$1" "$2" 2>/dev/null || true; }
clear_activity() { [ -x "$ACTIVITY" ] && python3 "$ACTIVITY" clear 2>/dev/null || true; }

FAILURES=()
for sensor in "$PLUGIN_DIR"/sensors/${PHASE}-*.md; do
  [ -f "$sensor" ] || continue
  sname="$(basename "$sensor" .md)"
  set_activity sensor "$sname"
  if ! python3 "$PLUGIN_DIR/scripts/sensor-runner.py" \
        --sensor "$sensor" \
        --artifact "$FILE_PATH" >&2; then
    FAILURES+=("$sname")
  fi
  clear_activity
done

if [ ${#FAILURES[@]} -gt 0 ]; then
  echo "[hook] ${PHASE} sensor failures: ${FAILURES[*]}" >&2
  exit 2
fi

FEATURE_ID="$(basename "$FILE_PATH" .md)"
MARKERS_DIR="$PLUGIN_DIR/outputs/.markers"
mkdir -p "$MARKERS_DIR"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ ! -f "$MARKERS_DIR/${FEATURE_ID}.${PHASE}-validate.start" ]; then
  if [ -f "$MARKERS_DIR/${FEATURE_ID}.${PHASE}-generate.start" ]; then
    printf '{"timestamp":"%s"}\n' "$NOW" > "$MARKERS_DIR/${FEATURE_ID}.${PHASE}-generate.end"
    printf '{"timestamp":"%s","session_id":"%s"}\n' "$NOW" "${CLAUDE_SESSION_ID:-}" > "$MARKERS_DIR/${FEATURE_ID}.${PHASE}-validate.start"
  fi
fi

exit 0
