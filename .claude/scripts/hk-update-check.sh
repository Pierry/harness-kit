#!/bin/sh
# Best-effort "update available" notice. Runs on SessionStart.
# Compares the installed version (.claude/.hk-version) against the latest
# release on GitHub. Network is hit at most once per ~24h (cached); the
# behind/ahead comparison still prints every session until you update.
# Never blocks, never fails a session: every path exits 0.
#
# Disable entirely with HK_UPDATE_CHECK=0 in the environment.

[ "${HK_UPDATE_CHECK:-1}" = "0" ] && exit 0

LOCAL_FILE=".claude/.hk-version"
CACHE_FILE=".claude/.hk-update-check"
REMOTE_URL="https://raw.githubusercontent.com/Pierry/harness-kit/main/VERSION"
TTL=86400  # 24h

[ -f "$LOCAL_FILE" ] || exit 0
LOCAL="$(tr -d ' \t\n\r' < "$LOCAL_FILE" 2>/dev/null)"
[ -n "$LOCAL" ] || exit 0

now="$(date +%s 2>/dev/null || echo 0)"

# Reuse cached remote version if the cache is fresh; otherwise fetch.
REMOTE=""
if [ -f "$CACHE_FILE" ]; then
  ts="$(sed -n '1p' "$CACHE_FILE" 2>/dev/null)"
  cached="$(sed -n '2p' "$CACHE_FILE" 2>/dev/null)"
  if [ -n "$ts" ] && [ "$((now - ts))" -lt "$TTL" ] 2>/dev/null; then
    REMOTE="$cached"
  fi
fi

if [ -z "$REMOTE" ]; then
  if command -v curl >/dev/null 2>&1; then
    REMOTE="$(curl -fsS --max-time 2 "$REMOTE_URL" 2>/dev/null | tr -d ' \t\n\r')"
  elif command -v wget >/dev/null 2>&1; then
    REMOTE="$(wget -qO- --timeout=2 "$REMOTE_URL" 2>/dev/null | tr -d ' \t\n\r')"
  fi
  # Cache whatever we got (or keep last good if the fetch failed).
  if [ -n "$REMOTE" ]; then
    printf '%s\n%s\n' "$now" "$REMOTE" > "$CACHE_FILE" 2>/dev/null || true
  elif [ -f "$CACHE_FILE" ]; then
    REMOTE="$(sed -n '2p' "$CACHE_FILE" 2>/dev/null)"
  fi
fi

[ -n "$REMOTE" ] || exit 0
[ "$REMOTE" = "$LOCAL" ] && exit 0

# Newer only if remote sorts strictly above local (version sort).
newest="$(printf '%s\n%s\n' "$LOCAL" "$REMOTE" | sort -V 2>/dev/null | tail -1)"
if [ "$newest" = "$REMOTE" ] && [ "$REMOTE" != "$LOCAL" ]; then
  printf 'harness-kit v%s available (you have v%s).\nupdate: /plugin update harness-kit  then  /harness-kit:update\n' "$REMOTE" "$LOCAL"
fi
exit 0
