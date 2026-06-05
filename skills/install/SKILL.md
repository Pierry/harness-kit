---
name: install
description: Install the harness-kit pipeline into the current project. Copies agents, slash commands, skills, hooks, and the status bar into the project's .claude/, plus AGENTS.md and CLAUDE.md at the repo root. Run after adding the harness-kit plugin from the marketplace.
user_invocable: true
---

Install harness-kit into the user's project. Plugin ships full harness; this skill lays it down via bundled installer.

## What it writes

Installer copies into the **target project** (`${CLAUDE_PROJECT_DIR}`):

- `.claude/agents/` — product-manager + staff-software-engineer (sensors, evals, guides, skills)
- `.claude/commands/` — `/product-manager:*`, `/sse:*`, `/pipeline:*`, `/context:*`
- `.claude/runtime/` — per-agent hooks + scripts (outputs/ stay target-side state)
- `.claude/hooks/` + `.claude/scripts/` — status bar, pipeline tracking, token accounting
- `.claude/shared/` — cross-agent guides
- `.claude/conventions/` — scaffold for project overrides
- `.claude/settings.json` — wires hooks + status bar (existing one backed up first)
- `AGENTS.md` at repo root; `CLAUDE.md` if absent

This modifies files in the user's repo. Tell user what runs before running. Existing `.claude/settings.json` backed up to `.claude/settings.json.bak.<stamp>`.

## Run

Requires `git` + `python3` (installer checks, exits if missing).

```bash
bash "${CLAUDE_PLUGIN_ROOT}/setup/install.sh" "${CLAUDE_PROJECT_DIR}"
```

Relay installer output verbatim. On `missing agents` / `git not found` / `python3 not found`, surface exact line.

## After

Tell user: **restart Claude Code** to load agents, commands, hooks, status bar. Then:

- `/golden-path` — the golden path: idea → merged PR in one command
- `/product-manager:prd | :prp | :run`
- `/sse:plan | :dev | :test | :pr | :run | :sdd`
- `/pipeline:continue | :reset`
- `/context:pack | :graph` (optional, need repomix / graphify)

Update later: `/plugin update harness-kit` then `/harness-kit:update`.
