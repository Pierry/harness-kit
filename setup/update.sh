#!/usr/bin/env bash
# harness-kit updater. Pulls latest source (git installs only), then re-runs
# the installer. For npm installs, you must upgrade the package first:
#   npm i -g @pieerry/harness-kit@latest
#
# v3.x → v4.x migration: install.sh detects a legacy .claude/plugins/ tree in
# the target and backs it up to .claude/.legacy-v3-backup/ before laying down
# the v4 structure (.claude/agents/, .claude/runtime/, AGENTS.md). Custom
# edits inside the legacy tree are preserved in the backup for manual merge.
#
# Usage:
#   bash /path/to/harness-kit/setup/update.sh [target-dir]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_VERSION="$(cat "$SOURCE_ROOT/VERSION" 2>/dev/null || echo "0.0.0")"

if [ -d "$SOURCE_ROOT/.git" ]; then
  echo "git install detected at $SOURCE_ROOT"
  echo "fetching latest source..."
  git -C "$SOURCE_ROOT" pull --ff-only
  NEW_VERSION="$(cat "$SOURCE_ROOT/VERSION" 2>/dev/null || echo "0.0.0")"
  if [ "$SOURCE_VERSION" != "$NEW_VERSION" ]; then
    echo "source: v$SOURCE_VERSION → v$NEW_VERSION"
  fi
else
  echo "npm install detected at $SOURCE_ROOT (no .git)"
  echo "source version bundled in this package: v$SOURCE_VERSION"
  echo ""
  echo "to fetch a newer version, upgrade the npm package first:"
  echo "  npm i -g @pieerry/harness-kit@latest"
  echo "then rerun: hk update"
  echo ""
  echo "continuing with reinstall of v$SOURCE_VERSION..."
fi

exec bash "$SCRIPT_DIR/install.sh" "$@"
