# Architecture

How a stage is built, what the status bar shows, what gets laid into your repo, and which tools the
harness leans on.

## Anatomy of every stage

```
GUIDE       how to write it           pipeline.md · coding-style.md
REF         context to pull in        AGENTS.md · prp/<feature>.md · conventions/{area}.md
SENSOR      must-pass structure       deterministic, blocks approval
EVAL        scored rubric             LLM-judge, threshold 8.0
```

An approval marker (`<!-- approved: -->`) gates the next stage. Token spend per phase is appended as
an inline `<!-- tokens: ... -->` comment. See [Commands & gates](COMMANDS.md) for the sensor and eval
list per stage.

## Runtime surfaces

Codex discovers the installed entry skills from `.agents/skills/` and executes the canonical
workflow specifications under `.claude/commands/`. Claude Code exposes those specifications as
slash commands and adds lifecycle hooks plus a status bar. Both runtimes share artifacts and state
under `.claude/runtime/`, so interrupted work remains portable between them.

### Claude Code status bar

A live indicator at the bottom of every Claude Code session:

```
idle · /product-manager:run · /sse:run · /pipeline:continue
billing-fix [prd+prp+plan+dev+test+pr] · prp approved · plan drafting · next /sse:plan · sensor: plan-structure
billing-fix · complete (prd/prp/plan/dev/test/pr)
```

State persists at `.claude/.pipeline-state.json`. Close the session and reopen, `/pipeline:continue`
picks up at the next pending stage. When the PR merges, state auto-clears.

### Update notice

A SessionStart hook (`.claude/scripts/hk-update-check.sh`) compares the installed version
(`.claude/.hk-version`) against the latest release on GitHub and prints a one-line notice when you are
behind. It is best-effort: the network is hit at most once per ~24h (result cached in
`.claude/.hk-update-check`), each call times out in 2s, and every path exits 0 so it never blocks or
fails a session. Offline, it stays silent. Disable it with `HK_UPDATE_CHECK=0` in your environment.

## Project conventions

The SSE agent has defaults per area. Override them per repo:

```
{your-repo}/.claude/conventions/{backend,web,mobile,devops}.md
```

Add only the area files you need; the agent reads them on top of its defaults. Reference:
[`conventions-override.md`](../.claude/agents/staff-software-engineer/guides/conventions-override.md).

## Permissions

A pipeline run should flow start to finish without stopping to ask whether it may run its own
plumbing. To make that safe and legible, the slash commands never improvise shell. They call named,
committed scripts:

| Script | Replaces | Runs in |
|--------|----------|---------|
| `marker.sh start\|approve` | inline `date` / `printf >>` marker writes | every stage |
| `preflight.sh <bins>` | inline `node -v` / `npm ping` / `$(...)` probes | `/sse:dev` |
| `run-sensors.sh` | inline `grep` / `for` sensor loops | pm + sse stages |

The installer pre-authorizes exactly these (plus `git`, `gh`, `jq`, and the project build tools
`gradlew`/`mvnw`/`npm`) in `settings.json` `permissions.allow`, both as a bare path and as
`bash <path>`. So you grant nothing mid-run, and what you would have been asked is a readable path,
not an opaque one-liner. Destructive ops (`rm -rf`, force push, `git reset --hard`) stay in
`permissions.deny` and always prompt. Existing settings are backed up on install, merge any custom
permissions back from the `.bak` file.

## Layout

What `hk install`, `$hk-install`, or `/harness-kit:install` lays down in your repo:

```
{your-repo}/
├── AGENTS.md                    agent registry + routing
├── CLAUDE.md                    workspace style + role
├── .agents/skills/              Codex-native hk-* workflow entry points
└── .claude/
    ├── agents/                  agent definitions (sensors, evals, guides, skills)
    ├── commands/                slash command entry points (pm, sse, context, pipeline)
    ├── shared/                  cross-agent guides (context-strategy.md)
    ├── hooks/                   status-line + lifecycle hooks
    ├── scripts/                 pipeline.py · activity.py · pr-monitor.py · marker.sh · preflight.sh · hk-update-check.sh · pack-repo.sh · graph-repo.sh
    ├── runtime/
    │   ├── hooks/<agent>/       per-agent lifecycle (post-write, post-eval, pre-prp-check)
    │   ├── scripts/<agent>/     per-agent utilities (sensor-runner, token-phase, link-validator, run-sensors.sh)
    │   ├── outputs/{pm,sse}/    generated artifacts, markers, tokens (incl. sse/sdd/ loop transcripts)
    │   └── cache/               repomix packs + graphify graphs (optional, gitignored)
    ├── conventions/             your per-repo overrides
    └── settings.json            hook wiring
```

Full path-by-path map in [`AGENTS.md`](../AGENTS.md).

### Marketplace packaging

- Claude Code reads `.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json`.
- Codex reads `.agents/plugins/marketplace.json` and `.codex-plugin/plugin.json`.
- Both catalogs point at this repository root as a bootstrap plugin, so the installer and shared
  workflow assets ship together without duplicated copies.

## Tooling

| Tool | Why | Required |
|------|-----|----------|
| [OpenAI Codex](https://developers.openai.com/codex/) or [Claude Code](https://claude.ai/code) | agent runtime | yes |
| `python3` | sensors, token accounting, pipeline state | yes |
| `git` | branch + commit ops | yes |
| [gh CLI](https://cli.github.com/) | opens PR, polls for merge | for `/sse:pr` |
| [repomix](https://repomix.com) | snapshot the target repo for AI context (`/context:pack`) | optional |
| [graphify](https://github.com/safishamsi/graphify) | queryable knowledge graph of a repo (`/context:graph`) | optional |

Install the optional tools:

```bash
npm i -g repomix           # or: brew install repomix
uv tool install graphifyy  # or: pipx install graphifyy   (CLI cmd is `graphify`)
```

The installer detects both and prints a hint if missing, it never auto-installs. See
[`context-strategy.md`](../.claude/shared/context-strategy.md) for when each tier is worth it
(grep vs pack vs graph).

Other optional: `jq` for token JSON queries; `JIRA_USERNAME` + `JIRA_API_TOKEN` to publish PRD/PRP to
Confluence.
