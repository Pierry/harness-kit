#!/usr/bin/env bash
# harness-kit updater. Pulls latest source (git installs only), then re-runs
# the installer.
#   - git install: git pull --ff-only, then install.
#   - plugin install: runs from the version loaded at session start. If a newer
#     version is already in the plugin cache (after /plugin update) it stops and
#     tells the user to RESTART Claude Code first, else it would re-lay the old
#     loaded version.
#   - npm install: upgrade the package first (npm i -g @pieerry/harness-kit@latest).
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
  case "$SOURCE_ROOT" in
    */plugins/cache/*)
      # Claude Code plugin install. The plugin cache holds one dir per fetched
      # version; this script runs from the version LOADED at session start
      # (CLAUDE_PLUGIN_ROOT), which only repoints after a restart. If a newer
      # version was already fetched (/plugin update) but not yet loaded,
      # laying it down here would re-install the STALE loaded version. Detect
      # that and stop with restart instructions instead.
      CACHE_PARENT="$(dirname "$SOURCE_ROOT")"
      NEWEST="$(ls -1 "$CACHE_PARENT" 2>/dev/null | sort -V | tail -1)"
      if [ -n "$NEWEST" ] && [ "$NEWEST" != "$SOURCE_VERSION" ]; then
        TOP="$(printf '%s\n%s\n' "$SOURCE_VERSION" "$NEWEST" | sort -V | tail -1)"
        if [ "$TOP" = "$NEWEST" ]; then
          echo "A newer harness-kit (v$NEWEST) is already in the plugin cache, but this"
          echo "session is still running v$SOURCE_VERSION (plugins load at startup)."
          echo ""
          echo "RESTART Claude Code, then rerun /harness-kit:update."
          echo "Running now would re-lay the old v$SOURCE_VERSION."
          exit 0
        fi
      fi
      echo "plugin install detected (v$SOURCE_VERSION)."
      echo "to move to a newer release: /plugin update harness-kit, RESTART Claude Code,"
      echo "then rerun /harness-kit:update. If /plugin update reports up-to-date but a"
      echo "newer release exists, run /plugin marketplace update harness-kit first."
      echo ""
      echo "continuing: laying down v$SOURCE_VERSION..."
      ;;
    *)
      echo "npm install detected at $SOURCE_ROOT (no .git)"
      echo "source version bundled in this package: v$SOURCE_VERSION"
      echo ""
      echo "to fetch a newer version, upgrade the npm package first:"
      echo "  npm i -g @pieerry/harness-kit@latest"
      echo "then rerun: hk update"
      echo ""
      echo "continuing with reinstall of v$SOURCE_VERSION..."
      ;;
  esac
fi

exec bash "$SCRIPT_DIR/install.sh" "$@"
