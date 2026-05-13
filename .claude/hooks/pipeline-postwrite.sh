#!/bin/sh
# PostToolUse hook for Write. If the written file is a tracked pipeline
# artifact, update state via pipeline.py detect-from-file.

set -e

FILE_PATH="${CLAUDE_TOOL_FILE_PATH:-}"
[ -z "$FILE_PATH" ] && exit 0

PIPELINE_PY=".claude/scripts/pipeline.py"
[ -x "$PIPELINE_PY" ] || exit 0

python3 "$PIPELINE_PY" detect-from-file "$FILE_PATH" >/dev/null 2>&1 || true
exit 0
