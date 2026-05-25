#!/usr/bin/env bash
# harness-kit installer (v4). Copies agents, runtime hooks/scripts,
# root hooks/scripts, slash commands, AGENTS.md/CLAUDE.md, and writes
# the wiring settings.json into a target repo. Reads VERSION at the
# repo root and records it in the target.
#
# Usage:
#   bash /path/to/harness-kit/setup/install.sh [target-dir]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET="${1:-${TARGET:-$(pwd)}}"

VERSION="$(cat "$SOURCE_ROOT/VERSION" 2>/dev/null || echo "0.0.0")"

if [ ! -d "$SOURCE_ROOT/.claude/agents/product-manager" ]; then
  echo "missing agents at $SOURCE_ROOT/.claude/agents/"
  echo "clone the repo first, then re-run: git clone https://github.com/Pierry/harness-kit ~/.harness-kit"
  exit 1
fi

command -v git >/dev/null 2>&1 || { echo "git not found"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "python3 not found"; exit 1; }

# Optional context tools (repomix snapshot, graphify knowledge graph).
# Both are no-ops if missing — /context:pack and /context:graph will print install hints.
if ! command -v repomix >/dev/null 2>&1; then
  echo "  optional: repomix not found. /context:pack disabled until you install it."
  echo "            npm i -g repomix   |   brew install repomix"
fi
if ! command -v graphify >/dev/null 2>&1; then
  echo "  optional: graphify not found. /context:graph disabled until you install it."
  echo "            uv tool install graphifyy   |   pipx install graphifyy   |   pip install graphifyy"
  echo "            (PyPI pkg graphifyy, double y; CLI cmd graphify)"
fi

OLD_VERSION="$(cat "$TARGET/.claude/.hk-version" 2>/dev/null || echo "")"

if [ -n "$OLD_VERSION" ] && [ "$OLD_VERSION" != "$VERSION" ]; then
  echo "harness-kit v$OLD_VERSION → v$VERSION at $TARGET"
elif [ -n "$OLD_VERSION" ]; then
  echo "harness-kit v$VERSION at $TARGET (reinstall)"
else
  echo "harness-kit v$VERSION installing at $TARGET"
fi

# Migrate legacy v3.x layout if detected. Backs up to .claude/.legacy-v3-backup/.
if [ -d "$TARGET/.claude/plugins" ]; then
  echo "  detected legacy v3.x plugins/ — backing up to .claude/.legacy-v3-backup/"
  STAMP="$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$TARGET/.claude/.legacy-v3-backup"
  mv "$TARGET/.claude/plugins" "$TARGET/.claude/.legacy-v3-backup/plugins.$STAMP"
fi

# 1) AGENTS.md + CLAUDE.md at the repo root.
cp "$SOURCE_ROOT/AGENTS.md" "$TARGET/AGENTS.md"
if [ ! -f "$TARGET/CLAUDE.md" ]; then
  cp "$SOURCE_ROOT/CLAUDE.md" "$TARGET/CLAUDE.md"
fi

# 2) Agent definitions (sensors, evals, guides, skills, README + orchestrator .md)
mkdir -p "$TARGET/.claude/agents"
for agent in product-manager staff-software-engineer; do
  rm -rf "$TARGET/.claude/agents/$agent"
  cp -R "$SOURCE_ROOT/.claude/agents/$agent" "$TARGET/.claude/agents/$agent"
  cp "$SOURCE_ROOT/.claude/agents/$agent.md" "$TARGET/.claude/agents/$agent.md"
done

# 3) Per-agent runtime hooks + scripts (NOT outputs — that's target-side state)
mkdir -p "$TARGET/.claude/runtime/hooks" "$TARGET/.claude/runtime/scripts" "$TARGET/.claude/runtime/outputs/pm/.markers" "$TARGET/.claude/runtime/outputs/sse/.markers" "$TARGET/.claude/runtime/outputs/sse/sdd" "$TARGET/.claude/runtime/cache/repomix" "$TARGET/.claude/runtime/cache/graphify"
touch "$TARGET/.claude/runtime/cache/repomix/.gitkeep" "$TARGET/.claude/runtime/cache/graphify/.gitkeep"
for agent in product-manager staff-software-engineer; do
  rm -rf "$TARGET/.claude/runtime/hooks/$agent"
  cp -R "$SOURCE_ROOT/.claude/runtime/hooks/$agent" "$TARGET/.claude/runtime/hooks/$agent"
done

# PM scripts: copy real files. SSE scripts: build dir of symlinks → PM's shared utilities.
# (SSE scripts in source repo are symlinks; npm pack drops symlinks, so we recreate target-side.)
rm -rf "$TARGET/.claude/runtime/scripts/product-manager"
cp -R "$SOURCE_ROOT/.claude/runtime/scripts/product-manager" "$TARGET/.claude/runtime/scripts/product-manager"

rm -rf "$TARGET/.claude/runtime/scripts/staff-software-engineer"
mkdir -p "$TARGET/.claude/runtime/scripts/staff-software-engineer"
for name in sensor-runner.py token-phase.py; do
  ln -sf "../product-manager/$name" "$TARGET/.claude/runtime/scripts/staff-software-engineer/$name"
done

# 4) Slash commands
mkdir -p "$TARGET/.claude/commands"
for ns in product-manager sse pipeline context; do
  rm -rf "$TARGET/.claude/commands/$ns"
  cp -R "$SOURCE_ROOT/.claude/commands/$ns" "$TARGET/.claude/commands/$ns"
done

# 4.5) Shared cross-agent guides
mkdir -p "$TARGET/.claude/shared"
cp -R "$SOURCE_ROOT/.claude/shared/." "$TARGET/.claude/shared/"

# 5) Root harness hooks (status-line + pipeline tracking + live activity)
mkdir -p "$TARGET/.claude/hooks"
for h in status-line.sh pipeline-prompt.sh pipeline-postwrite.sh pipeline-postedit.sh pipeline-session-start.sh activity-pre-read.sh; do
  cp "$SOURCE_ROOT/.claude/hooks/$h" "$TARGET/.claude/hooks/$h"
  chmod +x "$TARGET/.claude/hooks/$h"
done

# 6) Root harness scripts (pipeline state, activity, PR monitor, stage-card, context wrappers)
mkdir -p "$TARGET/.claude/scripts"
for s in pipeline.py activity.py pr-monitor.py; do
  cp "$SOURCE_ROOT/.claude/scripts/$s" "$TARGET/.claude/scripts/$s"
  chmod +x "$TARGET/.claude/scripts/$s"
done
for s in pack-repo.sh graph-repo.sh; do
  cp "$SOURCE_ROOT/.claude/scripts/$s" "$TARGET/.claude/scripts/$s"
  chmod +x "$TARGET/.claude/scripts/$s"
done
cp "$SOURCE_ROOT/.claude/scripts/stage-card.md" "$TARGET/.claude/scripts/stage-card.md"

# 6.5) Strip any __pycache__/.pyc that hitched a ride from the source repo
find "$TARGET/.claude" -name __pycache__ -type d -prune -exec rm -rf {} + 2>/dev/null || true
find "$TARGET/.claude" -name "*.pyc" -type f -delete 2>/dev/null || true

# 7) settings.json (back up existing if content differs)
if [ -f "$TARGET/.claude/settings.json" ]; then
  STAMP="$(date +%Y%m%d-%H%M%S)"
  BACKUP="$TARGET/.claude/settings.json.bak.$STAMP"
  cp "$TARGET/.claude/settings.json" "$BACKUP"
  echo "backed up existing settings.json -> .claude/settings.json.bak.$STAMP"
  echo "  if you customized permissions or hooks, merge them back from the backup."
fi
cat > "$TARGET/.claude/settings.json" <<'EOF'
{
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "Bash(./gradlew:*)",
      "Bash(./mvnw:*)",
      "Bash(npm:*)",
      "Bash(gh:*)",
      "Bash(jq:*)",
      "Read(.claude/runtime/outputs/**)",
      "Write(.claude/runtime/outputs/**)"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Bash(git push --force:*)",
      "Bash(git push -f:*)",
      "Bash(git reset --hard:*)"
    ]
  },
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "[ -x .claude/hooks/pipeline-session-start.sh ] && bash .claude/hooks/pipeline-session-start.sh; exit 0" }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          { "type": "command", "command": "[ -x .claude/hooks/pipeline-prompt.sh ] && bash .claude/hooks/pipeline-prompt.sh; exit 0" }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          { "type": "command", "command": "[ -x .claude/runtime/hooks/product-manager/pre-prp-check.sh ] && bash .claude/runtime/hooks/product-manager/pre-prp-check.sh; exit 0" }
        ]
      },
      {
        "matcher": "Read",
        "hooks": [
          { "type": "command", "command": "[ -x .claude/hooks/activity-pre-read.sh ] && bash .claude/hooks/activity-pre-read.sh; exit 0" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          { "type": "command", "command": "[ -x .claude/runtime/hooks/product-manager/post-write-prd.sh ] && bash .claude/runtime/hooks/product-manager/post-write-prd.sh; exit 0" },
          { "type": "command", "command": "[ -x .claude/runtime/hooks/product-manager/post-write-prp.sh ] && bash .claude/runtime/hooks/product-manager/post-write-prp.sh; exit 0" },
          { "type": "command", "command": "[ -x .claude/runtime/hooks/staff-software-engineer/post-write-sse.sh ] && bash .claude/runtime/hooks/staff-software-engineer/post-write-sse.sh; exit 0" },
          { "type": "command", "command": "[ -x .claude/hooks/pipeline-postwrite.sh ] && bash .claude/hooks/pipeline-postwrite.sh; exit 0" }
        ]
      },
      {
        "matcher": "Edit",
        "hooks": [
          { "type": "command", "command": "[ -x .claude/runtime/hooks/product-manager/post-eval-prd.sh ] && bash .claude/runtime/hooks/product-manager/post-eval-prd.sh; exit 0" },
          { "type": "command", "command": "[ -x .claude/runtime/hooks/product-manager/post-eval-prp.sh ] && bash .claude/runtime/hooks/product-manager/post-eval-prp.sh; exit 0" },
          { "type": "command", "command": "[ -x .claude/runtime/hooks/staff-software-engineer/post-eval-sse.sh ] && bash .claude/runtime/hooks/staff-software-engineer/post-eval-sse.sh; exit 0" },
          { "type": "command", "command": "[ -x .claude/hooks/pipeline-postedit.sh ] && bash .claude/hooks/pipeline-postedit.sh; exit 0" }
        ]
      }
    ]
  },
  "statusLine": {
    "type": "command",
    "command": "[ -x .claude/hooks/status-line.sh ] && bash .claude/hooks/status-line.sh || printf 'harness-kit not installed'"
  }
}
EOF

# Scaffold conventions folder (idempotent)
mkdir -p "$TARGET/.claude/conventions"
if [ ! -f "$TARGET/.claude/conventions/README.md" ]; then
  cat > "$TARGET/.claude/conventions/README.md" <<'EOF'
# Project Conventions

Override staff-software-engineer defaults for this repo. Create files as needed:

- backend.md
- web.md
- mobile.md
- devops.md

When a file exists here, the agent reads it on top of defaults. Rules in this folder win.

See `.claude/agents/staff-software-engineer/guides/conventions-override.md` for the full reference.
EOF
fi

# Record installed version
echo "$VERSION" > "$TARGET/.claude/.hk-version"

echo "done. restart Claude Code to load."
echo "  /product-manager:prd | :prp | :run"
echo "  /sse:plan | :dev | :test | :pr | :pr-monitor | :run | :sdd"
echo "  /context:pack | :graph"
echo "  /pipeline:continue | :reset"
