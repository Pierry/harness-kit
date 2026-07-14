#!/bin/sh
# PostToolUse hook for Edit. Re-detects state of tracked artifact (Edit may
# have added the approval marker).

set -e

# Claude Code passes tool details as JSON on stdin (tool_input.file_path).
# Fall back to the legacy env var for older hosts.
FILE_PATH="$(python3 -c 'import json,sys; ti=json.load(sys.stdin).get("tool_input",{}); print(ti.get("file_path") or ti.get("path") or "")' 2>/dev/null || true)"
[ -z "$FILE_PATH" ] && FILE_PATH="${CLAUDE_TOOL_FILE_PATH:-}"
[ -z "$FILE_PATH" ] && exit 0

PIPELINE_PY=".claude/scripts/pipeline.py"
[ -x "$PIPELINE_PY" ] || exit 0

python3 "$PIPELINE_PY" detect-from-file "$FILE_PATH" >/dev/null 2>&1 || true
exit 0
