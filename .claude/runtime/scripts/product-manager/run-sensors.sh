#!/usr/bin/env bash
# Run PM deterministic sensors against an artifact.
#
# Replaces the giant inline grep/for blob agents otherwise improvise from the
# sensor specs (which always trips the permission prompt). Invoke by path so a
# single allowlist entry covers every target repo:
#   Bash(.claude/runtime/scripts/product-manager/run-sensors.sh:*)
#
# Usage:
#   run-sensors.sh <artifact.md> <sensor.md> [sensor.md ...]
#
# For each sensor file:
#   - filename contains "links"  -> run link-validator.py (needs repo root)
#   - otherwise                  -> run sensor-runner.py (structure/tokens/rules)
# Exit 0 only if every sensor passes; 1 if any blocks.
set -u

here="$(cd "$(dirname "$0")" && pwd)"
artifact="${1:?usage: run-sensors.sh <artifact> <sensor.md>...}"
shift

if [ ! -f "$artifact" ]; then
  echo "[run-sensors] artifact not found: $artifact" >&2
  exit 1
fi

repo_root="$(pwd)"
rc=0
for sensor in "$@"; do
  if [ ! -f "$sensor" ]; then
    echo "[run-sensors] sensor not found, skipping: $sensor" >&2
    continue
  fi
  case "$sensor" in
    *links*)
      python3 "$here/link-validator.py" --artifact "$artifact" --repo-root "$repo_root" || rc=1
      ;;
    *)
      python3 "$here/sensor-runner.py" --sensor "$sensor" --artifact "$artifact" || rc=1
      ;;
  esac
done

if [ "$rc" -eq 0 ]; then
  echo "[run-sensors] all sensors passed"
fi
exit "$rc"
