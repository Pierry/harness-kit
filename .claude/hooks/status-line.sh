#!/bin/sh
# Status line for the harness-kit pipeline. Reads .claude/.pipeline-state.json
# (managed by .claude/scripts/pipeline.py) for live state. Falls back to a
# file-scan if state is absent. Appends current activity (sensor/eval/guide)
# in cyan when one is active.

PIPELINE_PY=".claude/scripts/pipeline.py"
ACTIVITY_PY=".claude/scripts/activity.py"

CYAN=$(printf '\033[36m')
RESET=$(printf '\033[0m')

append_activity() {
  if [ -x "$ACTIVITY_PY" ]; then
    A="$(python3 "$ACTIVITY_PY" read 2>/dev/null || true)"
    if [ -n "$A" ]; then
      printf ' · %s%s%s' "$CYAN" "$A" "$RESET"
    fi
  fi
}

if [ -x "$PIPELINE_PY" ] && [ -f ".claude/.pipeline-state.json" ]; then
  OUT="$(python3 "$PIPELINE_PY" render 2>/dev/null)"
  if [ -n "$OUT" ]; then
    printf '%s' "$OUT"
    append_activity
    exit 0
  fi
fi

# --- Fallback: original file-scan logic ---

PM_DIR=".claude/runtime/outputs/pm"
SSE_DIR=".claude/runtime/outputs/sse"

render() {
  LATEST=""
  for f in "$PM_DIR/prd/"*.md "$PM_DIR/prp/"*.md \
           "$SSE_DIR/plan/"*.md "$SSE_DIR/dev/"*.md \
           "$SSE_DIR/test/"*.md "$SSE_DIR/pr/"*.md; do
    [ -f "$f" ] || continue
    if [ -z "$LATEST" ] || [ "$f" -nt "$LATEST" ]; then
      LATEST="$f"
    fi
  done

  if [ -z "$LATEST" ]; then
    printf "idle · /product-manager:run · /sse:run · /pipeline:continue"
    return 0
  fi

  NOW=$(date +%s)
  MTIME=$(stat -f %m "$LATEST" 2>/dev/null || stat -c %Y "$LATEST" 2>/dev/null || echo 0)
  AGE=$((NOW - MTIME))
  if [ "$AGE" -ge 3600 ]; then
    printf "idle · /product-manager:run · /sse:run · /pipeline:continue"
    return 0
  fi

  FID=$(basename "$LATEST" .md)
  SLUG=$(echo "$FID" | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-//')

  check_state() {
    [ -f "$1" ] || { echo "pending"; return; }
    if grep -q "<!-- approved:" "$1" 2>/dev/null; then
      echo "approved"
    else
      echo "drafting"
    fi
  }

  prev_approved=""
  current_stage=""
  current_state=""
  for stage in prd prp plan dev test pr; do
    case $stage in
      prd)  f="$PM_DIR/prd/${FID}.md"  ;;
      prp)  f="$PM_DIR/prp/${FID}.md"  ;;
      plan) f="$SSE_DIR/plan/${FID}.md" ;;
      dev)  f="$SSE_DIR/dev/${FID}.md"  ;;
      test) f="$SSE_DIR/test/${FID}.md" ;;
      pr)   f="$SSE_DIR/pr/${FID}.md"   ;;
    esac
    s=$(check_state "$f")
    if [ "$s" = "approved" ]; then
      prev_approved=$stage
    else
      current_stage=$stage
      current_state=$s
      break
    fi
  done

  if [ -z "$current_stage" ]; then
    printf "%s · complete" "$SLUG"
    return 0
  fi

  case $current_stage in
    prd|prp) next="/product-manager:$current_stage" ;;
    *)       next="/sse:$current_stage" ;;
  esac

  if [ -z "$prev_approved" ]; then
    printf "%s · %s %s · next %s" "$SLUG" "$current_stage" "$current_state" "$next"
  else
    printf "%s · %s approved · %s %s · next %s" "$SLUG" "$prev_approved" "$current_stage" "$current_state" "$next"
  fi
}

OUT=$(render 2>/dev/null)
if [ -z "$OUT" ]; then
  printf "idle"
else
  printf '%s' "$OUT"
fi
append_activity
