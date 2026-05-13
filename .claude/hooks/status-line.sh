#!/bin/sh
# Status line for the PM and SSE plugin pipelines.
#
# Shows the current stage of the active feature. Stages, in order:
#   prd   (product-manager plugin)
#   prp   (product-manager plugin)
#   plan  (staff-software-engineer plugin)
#   dev   (staff-software-engineer plugin)
#   test  (staff-software-engineer plugin)
#   pr    (staff-software-engineer plugin)
#
# State per stage is "pending" (no file), "drafting" (file exists, no approval
# marker), or "approved" (approval marker present). The bar shows the previous
# approved stage plus the current stage, with the next command to run.
#
# A feature is "active" when any of its artifact files was modified in the last
# hour. With no active feature, the bar shows an idle prompt.

PM_DIR=".claude/plugins/product-manager"
SSE_DIR=".claude/plugins/staff-software-engineer"

render() {
  LATEST=""
  for f in "$PM_DIR/outputs/prd/"*.md "$PM_DIR/outputs/prp/"*.md \
           "$SSE_DIR/outputs/plan/"*.md "$SSE_DIR/outputs/dev/"*.md \
           "$SSE_DIR/outputs/test/"*.md "$SSE_DIR/outputs/pr/"*.md; do
    [ -f "$f" ] || continue
    if [ -z "$LATEST" ] || [ "$f" -nt "$LATEST" ]; then
      LATEST="$f"
    fi
  done

  if [ -z "$LATEST" ]; then
    printf "idle · start /product-manager:run or /sse:run"
    return 0
  fi

  NOW=$(date +%s)
  MTIME=$(stat -f %m "$LATEST" 2>/dev/null || stat -c %Y "$LATEST" 2>/dev/null || echo 0)
  AGE=$((NOW - MTIME))
  if [ "$AGE" -ge 3600 ]; then
    printf "idle · start /product-manager:run or /sse:run"
    return 0
  fi

  FID=$(basename "$LATEST" .md)
  # Strip leading YYYY-MM-DD-. Optional team prefix accepted (any kebab-case slug).
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
      prd)  f="$PM_DIR/outputs/prd/${FID}.md"  ;;
      prp)  f="$PM_DIR/outputs/prp/${FID}.md"  ;;
      plan) f="$SSE_DIR/outputs/plan/${FID}.md" ;;
      dev)  f="$SSE_DIR/outputs/dev/${FID}.md"  ;;
      test) f="$SSE_DIR/outputs/test/${FID}.md" ;;
      pr)   f="$SSE_DIR/outputs/pr/${FID}.md"   ;;
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
