#!/usr/bin/env bash
# Harness-kit context tool probe.
#
# Stages that pull target-repo context (prp, plan, sdd supervisor, design) run
# this once and pick tools by .claude/shared/context-strategy.md. Every tool is
# optional; a missing one means fall back to the next tier, never a failure.
# MCP servers are not visible to a shell: the agent checks its own tool list
# for mcp__semble__*, mcp__repowise__*, mcp__context7__* and prefers those.
#
# Usage: context-tools.sh [target-repo]   (default: cwd). Always exits 0.
set -u

target="${1:-$(pwd)}"
skills_dirs=("$target/.claude/skills" "$HOME/.claude/skills")

have() { command -v "$1" >/dev/null 2>&1; }
skill() {
  for d in "${skills_dirs[@]}"; do [ -f "$d/$1/SKILL.md" ] && return 0; done
  return 1
}
line() { printf '%-10s %-9s %s\n' "$1" "$2" "$3"; }

echo "=== context tools ($target) ==="

if have semble; then line semble yes "semble search \"<intent>\" $target --top-k 10"
elif have uvx; then line semble via-uvx "uvx --from 'semble[mcp]' semble search \"<intent>\" $target"
else line semble no "pip install 'semble[mcp]' | fallback: grep"; fi

if have repowise && [ -d "$target/.repowise" ]; then line repowise yes "repowise mcp tools: get_context, get_answer, get_risk"
elif have repowise; then line repowise no-index "run: repowise init $target (once)"
else line repowise no "optional: uv tool install repowise"; fi

if have joern && [ -f "$target/cpg.bin" ]; then line cpg yes "skill cpg: callers, impact, dead code"
elif skill cpg; then line cpg no-cpg "cpg skill present, cpg.bin missing (build takes minutes, ask first)"
else line cpg no "optional: joern + cpg skill"; fi

if have repomix; then line repomix yes "/context:pack <feature_id>"; else line repomix no "npm i -g repomix"; fi
if have graphify; then line graphify yes "/context:graph"; else line graphify no "uv tool install graphifyy"; fi
if have rtk; then line rtk yes "shell output compression active"; else line rtk no "brew install rtk && rtk init -g"; fi

if skill atomize; then line atomize yes "skill atomize: requirements -> atoms.json (PRD/PRP criteria)"; else line atomize no "-"; fi
if skill memoria; then line memoria yes "skill memoria: prior decisions (Graphiti)"; else line memoria no "-"; fi

echo "mcp: check own tool list for mcp__semble__search, mcp__repowise__get_context, mcp__context7__query-docs"
exit 0
