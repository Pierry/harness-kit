#!/usr/bin/env bash
# Pack target repo with repomix. Snapshot for AI context.
# Output: .claude/runtime/cache/repomix/{feature_id}.xml
#
# Usage:
#   pack-repo.sh <feature_id> [target_dir] [--include glob] [--style xml|markdown]
#
# Defaults:
#   target_dir = cwd
#   style      = xml
#   include    = repomix default (.gitignore aware)

set -e

FEATURE_ID="${1:?feature_id required}"
shift || true

TARGET="${PWD}"
STYLE="xml"
INCLUDE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --include) INCLUDE="$2"; shift 2 ;;
    --style)   STYLE="$2"; shift 2 ;;
    --*)       echo "unknown flag: $1"; exit 2 ;;
    *)         TARGET="$1"; shift ;;
  esac
done

command -v repomix >/dev/null 2>&1 || {
  echo "repomix not installed"
  echo "install: npm i -g repomix  |  brew install repomix"
  echo "docs:    https://repomix.com"
  exit 127
}

CACHE_ROOT=".claude/runtime/cache/repomix"
mkdir -p "$CACHE_ROOT"
OUT="$CACHE_ROOT/${FEATURE_ID}.${STYLE}"

ARGS=(--style "$STYLE" -o "$OUT")
[ -n "$INCLUDE" ] && ARGS+=(--include "$INCLUDE")

echo "pack: $TARGET → $OUT"
(cd "$TARGET" && repomix "${ARGS[@]}" --quiet)

TOKENS=$(grep -oE "Total Tokens:.*" "$OUT" 2>/dev/null | head -1 || true)
SIZE=$(wc -c < "$OUT" | tr -d ' ')

echo "ok"
echo "  path:   $OUT"
echo "  size:   ${SIZE} bytes"
[ -n "$TOKENS" ] && echo "  tokens: $TOKENS"
