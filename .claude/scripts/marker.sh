#!/usr/bin/env bash
# Harness-kit marker emitter.
#
# Replaces inline `TS=$(date); printf ... > marker` and `printf ... >> artifact`
# that agents otherwise improvise (and that always trip the permission prompt,
# because command-substitution + redirect cannot be statically analyzed).
#
# Invoke by path so a single allowlist entry covers every target repo:
#   Bash(.claude/scripts/marker.sh:*)
#
# Usage:
#   marker.sh start <marker_path>
#       Write {"timestamp": <ISO-8601 UTC>, "session_id": ""} to <marker_path>.
#       Creates the parent .markers/ dir if missing.
#
#   marker.sh approve <artifact_path> <score> [handoff]
#       Append the approval marker to <artifact_path> using today's UTC date.
#       Pass the literal word "handoff" as the 3rd arg to add
#       `ready-for-handoff: true` (PRP stage).
#
#       NOT wired into any stage command, and deliberately so. The post-eval-*
#       hooks are registered on PostToolUse matcher `Edit`, so a Bash append
#       fires nothing: no {phase}-validate.end, no token-phase.py, no
#       phase-log.py, no `<!-- published: -->`. Stage commands append the
#       approval marker with the Edit tool instead, which is already
#       allowlisted via Edit(.claude/runtime/outputs/**). Kept only for
#       out-of-band/manual approval of an artifact whose hooks already ran.
set -euo pipefail

cmd="${1:-}"
case "$cmd" in
  start)
    mp="${2:?usage: marker.sh start <marker_path>}"
    mkdir -p "$(dirname "$mp")"
    printf '{"timestamp": "%s", "session_id": ""}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$mp"
    echo "marker written: $mp"
    ;;
  approve)
    f="${2:?usage: marker.sh approve <artifact> <score> [handoff]}"
    score="${3:?score required}"
    handoff="${4:-}"
    [ -f "$f" ] || { echo "marker.sh: artifact not found: $f" >&2; exit 1; }
    day="$(date -u +%Y-%m-%d)"
    if [ "$handoff" = "handoff" ]; then
      printf '\n<!-- approved: %s score=%s ready-for-handoff: true -->\n' "$day" "$score" >> "$f"
    else
      printf '\n<!-- approved: %s score=%s -->\n' "$day" "$score" >> "$f"
    fi
    echo "approved: $f (score=$score${handoff:+ $handoff})"
    ;;
  *)
    echo "usage: marker.sh start <marker_path> | approve <artifact> <score> [handoff]" >&2
    exit 2
    ;;
esac
