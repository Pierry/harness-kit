#!/bin/bash
# Fires before Write tool creates a PRP file. Refuses if there is no approved
# PRD for the same feature slug.
#
# Registered in .claude/settings.json under PreToolUse > Write matcher.

set -euo pipefail

FILE_PATH="${CLAUDE_TOOL_FILE_PATH:-}"
AGENT_DIR=".claude/agents/product-manager"
OUTPUTS_DIR=".claude/runtime/outputs/pm"
SCRIPTS_DIR=".claude/runtime/scripts/product-manager"

case "$FILE_PATH" in
  *.claude/runtime/outputs/pm/prp/*.md) ;;
  *) exit 0 ;;
esac

# Allow rewrites of an existing PRP
if [ -f "$FILE_PATH" ]; then
  exit 0
fi

# Extract slug from PRP filename: YYYY-MM-DD-{slug}.md
PRP_BASENAME="$(basename "$FILE_PATH" .md)"
SLUG="$(echo "$PRP_BASENAME" | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-//')"

if [ -z "$SLUG" ]; then
  echo "[hook] PRP filename must follow YYYY-MM-DD-{slug}.md. Got: $PRP_BASENAME" >&2
  exit 2
fi

# Look for any approved PRD matching the slug
MATCHED=""
for prd in "$OUTPUTS_DIR"/prd/*"-${SLUG}.md"; do
  [ -f "$prd" ] || continue
  if grep -q "<!-- approved:" "$prd"; then
    MATCHED="$prd"
    break
  fi
done

if [ -z "$MATCHED" ]; then
  echo "[hook] No approved PRD found for slug '$SLUG'." >&2
  echo "[hook] Run /product-manager:prd first and ensure the PRD has the <!-- approved: --> marker." >&2
  exit 2
fi

echo "[hook] PRP gate cleared: source PRD: $(basename "$MATCHED")" >&2
exit 0
