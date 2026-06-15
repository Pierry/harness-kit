#!/usr/bin/env bash
#
# setup-qmd.sh — index the harness-kit guide tree for qmd (local semantic search).
#
# qmd (https://github.com/tobi/qmd) lets agents query the harness's own guides,
# skills, sensors, and evals semantically and get back only the relevant excerpt
# instead of loading whole files. This reduces INPUT tokens per stage.
#
# Run once, from the root of a repo where harness-kit is installed. Re-run after
# you add or materially change guides/skills to refresh the embeddings.
#
# Heads up: the first `qmd embed` downloads ~2GB of local models
# (~300MB embeddings + ~640MB reranker + ~1.1GB query expansion). One time.

set -euo pipefail

GREEN=$'\033[32m'; YELLOW=$'\033[33m'; DIM=$'\033[2m'; BOLD=$'\033[1m'; RESET=$'\033[0m'

if ! command -v qmd >/dev/null 2>&1; then
  cat <<EOF
${YELLOW}qmd not installed${RESET}
  install: npm install -g @tobilu/qmd
  docs:    https://github.com/tobi/qmd
EOF
  exit 1
fi

if [ ! -d ".claude" ]; then
  echo "${YELLOW}No .claude/ here.${RESET} Run this from a repo where you've run /harness-kit:install."
  exit 1
fi

echo "${BOLD}Indexing the harness-kit guide tree for qmd${RESET}"

# Collections to index, only the dirs that exist in this repo.
# name:path pairs. The guide-bearing trees of the harness.
declare -a COLLECTIONS=(
  "agents:.claude/agents"
  "commands:.claude/commands"
  "shared:.claude/shared"
  "skills:skills"
)

added=0
for entry in "${COLLECTIONS[@]}"; do
  name="${entry%%:*}"; path="${entry#*:}"
  if [ -d "$path" ]; then
    echo "  ${DIM}+ collection${RESET} ${name} ${DIM}<- ${path}${RESET}"
    qmd collection add "$path" --name "$name" >/dev/null 2>&1 || \
      qmd collection add "$path" --name "$name" || true
    added=$((added + 1))
  fi
done

if [ "$added" -eq 0 ]; then
  echo "${YELLOW}No indexable directories found.${RESET}"
  exit 1
fi

# A context the agent can target: the whole pipeline knowledge base.
echo "  ${DIM}+ context${RESET} harness-kit"
qmd context add qmd://agents qmd://commands qmd://shared qmd://skills \
  "harness-kit pipeline: agents, commands, sensors, evals, guides, skill conventions" \
  >/dev/null 2>&1 || true

echo "${DIM}Embedding (first run downloads ~2GB of local models, one time)...${RESET}"
qmd embed

cat <<EOF

${GREEN}qmd ready.${RESET}

Register the MCP server so agents can query it. Add to .claude/settings.json:

  ${DIM}{
    "mcpServers": {
      "qmd": { "command": "qmd", "args": ["mcp"] }
    }
  }${RESET}

  Or run it as a daemon (avoids ~1s model reload per session):
    qmd mcp --http --daemon

Then an agent can run  qmd:query "branch name regex"  and get back only the
relevant guide section instead of loading the whole file.
EOF
