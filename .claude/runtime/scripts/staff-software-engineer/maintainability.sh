#!/usr/bin/env bash
# Maintainability sensor. Runs the target repo's own quality tooling and
# reports what ran, what failed, and what is not configured at all.
#
# Why this is a script and not a markdown rule: Böckeler's finding in
# "Maintainability sensors for coding agents" is that an agent reliably ignores
# a sensor unless it is hardwired, and that markdown guides alone are "quite
# unreliable". code-conventions.md asked the agent to please run the linter.
# This runs it.
#
# Invoke by path so a single allowlist entry covers every target repo:
#   Bash(.claude/runtime/scripts/staff-software-engineer/maintainability.sh:*)
#
# Usage:
#   maintainability.sh [--repo-root DIR]
#
# Exit codes:
#   0  every configured tool passed
#   1  a configured tool failed
#   4  no maintainability tooling configured in this repo. NOT a pass: nothing
#      was checked. Reported loudly so the gap is visible rather than green.
set -u

repo_root="."
[ "${1:-}" = "--repo-root" ] && repo_root="${2:?--repo-root needs a dir}"
cd "$repo_root" || { echo "[maintainability] cannot enter $repo_root" >&2; exit 1; }

ran=0
failed=""
have() { command -v "$1" >/dev/null 2>&1; }
npm_script() { [ -f package.json ] && node -e "process.exit(require('./package.json').scripts?.['$1']?0:1)" 2>/dev/null; }

run() { # run <label> <cmd...>
  label="$1"; shift
  echo "[maintainability] running $label: $*" >&2
  if "$@" >&2; then
    echo "[maintainability] $label ok" >&2
  else
    echo "[maintainability] $label FAILED" >&2
    failed="$failed $label"
  fi
  ran=$((ran + 1))
}

# JS/TS. Prefer the repo's own scripts over an imposed config.
if npm_script lint;      then run lint npm run --silent lint; fi
if npm_script typecheck; then run typecheck npm run --silent typecheck; fi

# Python.
if [ -f pyproject.toml ] || [ -f setup.cfg ] || [ -f ruff.toml ]; then
  if have ruff; then run ruff ruff check .
  elif have flake8; then run flake8 flake8 .
  fi
fi

# JVM.
if [ -f build.gradle ] || [ -f build.gradle.kts ]; then
  if [ -x ./gradlew ] && ./gradlew tasks --all 2>/dev/null | grep -q ktlintCheck; then
    run ktlint ./gradlew ktlintCheck
  fi
elif [ -f pom.xml ]; then
  if grep -q checkstyle pom.xml 2>/dev/null; then
    if [ -x ./mvnw ]; then run checkstyle ./mvnw -q checkstyle:check
    elif have mvn; then run checkstyle mvn -q checkstyle:check
    fi
  fi
fi

# Secrets. Cheap, high value, and never repo-specific.
if have gitleaks; then run gitleaks gitleaks detect --no-banner --redact; fi

if [ "$ran" -eq 0 ]; then
  cat >&2 <<'MSG'
[maintainability] NOT CHECKED: this repo configures no maintainability tooling
  that this sensor knows how to run. Nothing was verified, so this is not a pass.
  Add one of: an npm "lint"/"typecheck" script, ruff/flake8 config, gradle
  ktlintCheck, maven checkstyle, or install gitleaks.
  Cheapest first step per Bockeler: turn on complexity, file-length and
  function-length limits. They are off in ESLint's default preset.
MSG
  exit 4
fi

if [ -n "$failed" ]; then
  echo "[maintainability] failed:$failed" >&2
  exit 1
fi

echo "[maintainability] all $ran configured tool(s) passed" >&2
exit 0
