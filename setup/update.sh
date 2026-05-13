#!/usr/bin/env bash
# harness-kit updater. Pulls latest source, then re-runs the installer.
#
# Usage:
#   bash /path/to/harness-kit/setup/update.sh [target-dir]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -d "$SOURCE_ROOT/.git" ]; then
  echo "fetching latest source..."
  git -C "$SOURCE_ROOT" pull --ff-only
fi

exec bash "$SCRIPT_DIR/install.sh" "$@"
