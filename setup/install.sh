#!/usr/bin/env bash
# harness-kit installer. Copies plugins, status-line hook, and
# settings.json into a target repo. Reads VERSION at the repo root and records
# it in the target.
#
# Usage:
#   bash /path/to/harness-kit/setup/install.sh [target-dir]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET="${1:-${TARGET:-$(pwd)}}"

VERSION="$(cat "$SOURCE_ROOT/VERSION" 2>/dev/null || echo "0.0.0")"

if [ ! -d "$SOURCE_ROOT/.claude/plugins/product-manager" ]; then
  echo "missing plugins at $SOURCE_ROOT/.claude/plugins/"
  echo "clone the repo first, then re-run: git clone https://github.com/Pierry/harness-kit ~/.harness-kit"
  exit 1
fi

command -v git >/dev/null 2>&1 || { echo "git not found"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "python3 not found"; exit 1; }

OLD_VERSION="$(cat "$TARGET/.claude/.hk-version" 2>/dev/null || echo "")"

if [ -n "$OLD_VERSION" ] && [ "$OLD_VERSION" != "$VERSION" ]; then
  echo "harness-kit v$OLD_VERSION → v$VERSION at $TARGET"
elif [ -n "$OLD_VERSION" ]; then
  echo "harness-kit v$VERSION at $TARGET (reinstall)"
else
  echo "harness-kit v$VERSION installing at $TARGET"
fi

# Copy plugin support code (hooks, scripts, guides, sensors, evals, skills, outputs)
mkdir -p "$TARGET/.claude/plugins"
for plugin in product-manager staff-software-engineer; do
  rm -rf "$TARGET/.claude/plugins/$plugin"
  cp -R "$SOURCE_ROOT/.claude/plugins/$plugin" "$TARGET/.claude/plugins/$plugin"
done

# Re-resolve symlinks in SSE scripts
for f in "$TARGET/.claude/plugins/staff-software-engineer/scripts/"*; do
  if [ -L "$f" ]; then
    name="$(basename "$f")"
    rm "$f"
    ln -sf "../../product-manager/scripts/$name" "$f"
  fi
done

# Copy slash commands and Task-invokable agents
mkdir -p "$TARGET/.claude/commands" "$TARGET/.claude/agents"
for ns in product-manager sse; do
  rm -rf "$TARGET/.claude/commands/$ns"
  cp -R "$SOURCE_ROOT/.claude/commands/$ns" "$TARGET/.claude/commands/$ns"
done
for agent in product-manager staff-software-engineer; do
  cp "$SOURCE_ROOT/.claude/agents/$agent.md" "$TARGET/.claude/agents/$agent.md"
done

# Clean up legacy plugin layout from older installs
for plugin in product-manager staff-software-engineer; do
  rm -rf "$TARGET/.claude/plugins/$plugin/commands" \
         "$TARGET/.claude/plugins/$plugin/agents" \
         "$TARGET/.claude/plugins/$plugin/.claude-plugin"
done

# Copy status-line hook
mkdir -p "$TARGET/.claude/hooks"
cp "$SOURCE_ROOT/.claude/hooks/status-line.sh" "$TARGET/.claude/hooks/status-line.sh"
chmod +x "$TARGET/.claude/hooks/status-line.sh"

# Settings.json
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
      "Read(outputs/**)",
      "Write(outputs/**)"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Bash(git push --force:*)",
      "Bash(git push -f:*)",
      "Bash(git reset --hard:*)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          { "type": "command", "command": "[ -x .claude/plugins/product-manager/hooks/pre-prp-check.sh ] && bash .claude/plugins/product-manager/hooks/pre-prp-check.sh; exit 0" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          { "type": "command", "command": "[ -x .claude/plugins/product-manager/hooks/post-write-prd.sh ] && bash .claude/plugins/product-manager/hooks/post-write-prd.sh; exit 0" },
          { "type": "command", "command": "[ -x .claude/plugins/product-manager/hooks/post-write-prp.sh ] && bash .claude/plugins/product-manager/hooks/post-write-prp.sh; exit 0" },
          { "type": "command", "command": "[ -x .claude/plugins/staff-software-engineer/hooks/post-write-plan.sh ] && bash .claude/plugins/staff-software-engineer/hooks/post-write-plan.sh; exit 0" }
        ]
      },
      {
        "matcher": "Edit",
        "hooks": [
          { "type": "command", "command": "[ -x .claude/plugins/product-manager/hooks/post-eval-prd.sh ] && bash .claude/plugins/product-manager/hooks/post-eval-prd.sh; exit 0" },
          { "type": "command", "command": "[ -x .claude/plugins/product-manager/hooks/post-eval-prp.sh ] && bash .claude/plugins/product-manager/hooks/post-eval-prp.sh; exit 0" },
          { "type": "command", "command": "[ -x .claude/plugins/staff-software-engineer/hooks/post-eval-plan.sh ] && bash .claude/plugins/staff-software-engineer/hooks/post-eval-plan.sh; exit 0" }
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

Override staff-software-engineer plugin defaults for this repo. Create files as needed:

- backend.md
- web.md
- mobile.md
- devops.md

When a file exists here, plugin reads it on top of defaults. Rules in this folder win.

See `.claude/plugins/staff-software-engineer/guides/conventions-override.md` for the full reference.
EOF
fi

# Record installed version
echo "$VERSION" > "$TARGET/.claude/.hk-version"

echo "done. restart Claude Code to load."
echo "  /product-manager:prd | :prp | :run"
echo "  /sse:plan | :dev | :test | :pr | :run"
