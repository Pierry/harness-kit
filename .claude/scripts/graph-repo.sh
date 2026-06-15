#!/usr/bin/env bash
# Build knowledge graph of target repo with graphify.
# Output: .claude/runtime/cache/graphify/{repo_slug}/graphify-out/
#
# Code files processed locally via Tree-sitter, no API key needed.
# Non-code files (docs, PDFs, images) require an LLM key if present.
#
# Usage:
#   graph-repo.sh [target_dir] [--update] [--deep] [--wiki]
#
# Defaults: target_dir = cwd, fresh build (rerun overwrites)

set -e

TARGET="${PWD}"
EXTRA_ARGS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --update) EXTRA_ARGS+=(--update); shift ;;
    --deep)   EXTRA_ARGS+=(--mode deep); shift ;;
    --wiki)   EXTRA_ARGS+=(--wiki); shift ;;
    --*)      echo "unknown flag: $1 (pass-through flags: --update --deep --wiki)"; exit 2 ;;
    *)        TARGET="$1"; shift ;;
  esac
done

command -v graphify >/dev/null 2>&1 || {
  echo "graphify not installed"
  echo "install: uv tool install graphifyy  |  pipx install graphifyy  |  pip install graphifyy"
  echo "note:    PyPI pkg is graphifyy (double y), CLI cmd is graphify"
  echo "docs:    https://github.com/safishamsi/graphify"
  exit 127
}

ABS_TARGET="$(cd "$TARGET" && pwd)"
SLUG="$(basename "$ABS_TARGET")-$(echo "$ABS_TARGET" | shasum | cut -c1-8)"
CACHE_DIR=".claude/runtime/cache/graphify/$SLUG"

mkdir -p "$CACHE_DIR"

echo "graph: $ABS_TARGET → $CACHE_DIR/graphify-out/"
[ ${#EXTRA_ARGS[@]} -gt 0 ] && echo "  args: ${EXTRA_ARGS[*]}"

# graphify writes graphify-out/ into cwd. cd cache, run with abs target.
(cd "$CACHE_DIR" && graphify "$ABS_TARGET" "${EXTRA_ARGS[@]}")

OUT="$CACHE_DIR/graphify-out"
if [ ! -d "$OUT" ]; then
  echo "expected output dir not found: $OUT"
  exit 1
fi

echo "ok"
echo "  graph:  $OUT/graph.json"
echo "  view:   open $OUT/graph.html"
echo "  report: $OUT/GRAPH_REPORT.md"
echo "  re-run with --update for incremental refresh"
