#!/bin/sh
# PreToolUse hook on Read. If the file being read is a sensor/eval/guide
# under any agent, mark current activity so status-line.sh can surface it.

FILE_PATH="${CLAUDE_TOOL_FILE_PATH:-}"
[ -z "$FILE_PATH" ] && exit 0

KIND=""
case "$FILE_PATH" in
  */agents/*/sensors/*.md) KIND=sensor ;;
  */agents/*/evals/*.md)   KIND=eval ;;
  */agents/*/guides/*.md)  KIND=guide ;;
  *) exit 0 ;;
esac

NAME="$(basename "$FILE_PATH" .md)"
[ -x ".claude/scripts/activity.py" ] && python3 .claude/scripts/activity.py set "$KIND" "$NAME" 2>/dev/null
exit 0
