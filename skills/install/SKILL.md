---
name: install
description: Install Harness Kit into the current project for Codex and Claude Code. Copies shared workflow assets, Codex repo skills, Claude commands and hooks, plus root instructions. Run after adding the plugin.
---

Install harness-kit into the user's project. The plugin ships the full harness; this skill lays it
down via the bundled installer. Runtime-specific environment variables are optional conveniences,
not requirements.

## What it writes

Installer copies into the **target project** (`${CLAUDE_PROJECT_DIR}`):

- `.claude/agents/`, product-manager + staff-software-engineer (sensors, evals, guides, skills)
- `.claude/commands/`, `/product-manager:*`, `/sse:*`, `/pipeline:*`, `/context:*`
- `.claude/runtime/`, per-agent hooks + scripts (outputs/ stay target-side state)
- `.claude/hooks/` + `.claude/scripts/`, status bar, pipeline tracking, token accounting
- `.claude/shared/`, cross-agent guides
- `.claude/conventions/`, scaffold for project overrides
- `.claude/settings.json`, wires hooks + status bar (existing one backed up first)
- `AGENTS.md` at repo root; `CLAUDE.md` if absent
- `.agents/skills/`, Codex-native `$hk-*` workflow entry points

This modifies files in the user's repo. Tell user what runs before running. Existing `.claude/settings.json` backed up to `.claude/settings.json.bak.<stamp>`.

## Run

Requires `git` + `python3` (installer checks, exits if missing).

Resolve the plugin root by walking up from this `SKILL.md` to the directory containing
`setup/install.sh`. Resolve the target as the current repository root. In Claude Code,
`${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PROJECT_DIR}` may be used when available.

```bash
bash <plugin-root>/setup/install.sh <target-repository-root>
```

Relay installer output verbatim. On `missing agents` / `git not found` / `python3 not found`, surface exact line.

## After

Tell Codex users to start a new thread so `AGENTS.md` and repo skills reload. Then:

- `$hk-golden-path`
- `$hk-product-manager [prd|prp|run]`
- `$hk-sse [plan|dev|test|pr|run|sdd]`
- `$hk-system-design [design|review|run]`
- `$hk-pipeline [continue|reset]`
- `$hk-context [pack|graph]`

Tell Claude Code users to restart to load agents, commands, hooks, and the status bar. Then:

- `/golden-path`, the golden path: idea → merged PR in one command
- `/product-manager:prd | :prp | :run`
- `/sse:plan | :dev | :test | :pr | :run | :sdd`
- `/pipeline:continue | :reset`
- `/context:pack | :graph` (optional, need repomix / graphify)

Update later with `$hk-update` or `npx @pieerry/harness-kit@latest update` in Codex; use
`/plugin update harness-kit`, restart, then `/harness-kit:update` in Claude Code.
