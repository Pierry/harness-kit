#!/usr/bin/env bash
# Harness-kit dev preflight probe.
#
# Replaces inline `echo "node: $(node -v)"; npm ping` style env checks that
# agents improvise at the start of /sse:dev (command-substitution always trips
# the permission prompt). Invoke by path so one allowlist entry covers every
# target repo:
#   Bash(.claude/scripts/preflight.sh:*)
#
# Usage: preflight.sh [tool ...]
#   With no args, probes a default set. Never fails (always exits 0) so it
#   cannot block the pipeline.
set -u

tools=("$@")
if [ "${#tools[@]}" -eq 0 ]; then
  tools=(node npm git)
fi

echo "=== preflight ==="
for t in "${tools[@]}"; do
  if command -v "$t" >/dev/null 2>&1; then
    case "$t" in
      node) echo "node: $(node -v 2>&1)" ;;
      npm)  echo "npm: $(npm -v 2>&1)" ;;
      git)  echo "git: $(git --version 2>&1)" ;;
      java) echo "java: $(java -version 2>&1 | head -1)" ;;
      python3) echo "python3: $(python3 --version 2>&1)" ;;
      *)    echo "$t: present ($(command -v "$t"))" ;;
    esac
  else
    echo "$t: NOT FOUND"
  fi
done
exit 0
