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
# Collect per-sensor results as "name|status" lines for the report.
results=""
for sensor in "$@"; do
  if [ ! -f "$sensor" ]; then
    echo "[run-sensors] sensor not found, skipping: $sensor" >&2
    continue
  fi
  name="$(basename "$sensor" .md)"
  case "$sensor" in
    *links*)
      python3 "$here/link-validator.py" --artifact "$artifact" --repo-root "$repo_root"; srrc=$?
      ;;
    *)
      python3 "$here/sensor-runner.py" --sensor "$sensor" --artifact "$artifact"; srrc=$?
      ;;
  esac
  [ "$srrc" -ne 0 ] && rc=1
  status="pass"; [ "$srrc" -ne 0 ] && status="fail"
  results="${results}${name}|${status}
"
done

# Write a per-run report the cockpit reads for real pass/fail. Derive
# feature/stage/agent from the artifact path (.../outputs/<agent>/<stage>/<feat>.md).
feature="$(basename "$artifact" .md)"
stage="$(basename "$(dirname "$artifact")")"
agent="$(basename "$(dirname "$(dirname "$artifact")")")"
reports_dir="$repo_root/.claude/runtime/outputs/${agent}/reports"
mkdir -p "$reports_dir"
printf '%s' "$results" | python3 -c "
import json, sys, time
sensors = []
for line in sys.stdin.read().splitlines():
    if not line.strip():
        continue
    n, s = line.rsplit('|', 1)
    sensors.append({'name': n, 'status': s})
report = {
    'stage': '$stage',
    'feature_id': '$feature',
    'updated_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'sensors': sensors,
}
open('$reports_dir/${feature}.${stage}.json', 'w').write(json.dumps(report, indent=2))
" 2>/dev/null || echo "[run-sensors] report write skipped" >&2

if [ "$rc" -eq 0 ]; then
  echo "[run-sensors] all sensors passed"
fi
exit "$rc"
