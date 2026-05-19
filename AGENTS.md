# AGENTS.md — Agent Registry & Routing

Source of truth for every agent, skill, and runtime path in this workspace.

This file is the **declarative spec**. Execution lives in `.claude/agents/` (definitions), `.claude/runtime/` (state, outputs), and `.claude/shared/` (cross-agent docs). Pipelines like `/sse:run` and `/product-manager:run` consult this registry when dispatching.

Portable across tools (Claude Code, Cursor, Codex) — all read `AGENTS.md` at the repo root.

---

## Quick map

```
AGENTS.md                          ← this file: registry + routing
CLAUDE.md                          ← project context (style, role, conventions)
.claude/
├── agents/                        ← per-agent definitions + bundled assets
│   ├── product-manager/
│   │   ├── README.md
│   │   ├── sensors/               deterministic checks
│   │   ├── evals/                 LLM-judge rubrics
│   │   ├── guides/                pipeline, writing style, templates, examples
│   │   └── skills/                prd, prp
│   ├── staff-software-engineer/
│   │   ├── README.md
│   │   ├── sensors/
│   │   ├── evals/
│   │   ├── guides/                pipeline, coding-style, commit-style, conventions-override
│   │   └── skills/                backend, web, mobile, devops
│   ├── product-manager.md         orchestrator agent
│   └── staff-software-engineer.md orchestrator agent
├── commands/                      ← slash-command entry points
│   ├── product-manager/           /product-manager:{prd,prp,run}
│   ├── sse/                       /sse:{plan,dev,test,pr,run}
│   └── pipeline/                  /pipeline:{continue,reset}
├── conventions/                   ← generic conventions (overridable per repo)
├── hooks/                         ← root lifecycle hooks (session-start, prompt, postedit, postwrite, status-line, activity-pre-read)
├── scripts/                       ← root utilities (pipeline.py, activity.py, pr-monitor.py)
└── runtime/                       ← generated artifacts + per-agent hooks/scripts
    ├── outputs/
    │   ├── pm/{prd,prp,tokens,.markers}/
    │   └── sse/{plan,dev,test,pr,tokens,.markers}/
    ├── hooks/
    │   ├── product-manager/       phase markers, sensor gates, eval, publish
    │   └── staff-software-engineer/
    └── scripts/
        ├── product-manager/       sensor-runner, token-phase, link-validator, confluence-publish
        └── staff-software-engineer/  token-phase
```

---

## Agent registry

### Orchestrators

| Agent | When to use | Entry | Definition |
|---|---|---|---|
| `product-manager` | Generate PRD then PRP for a squad/feature | `/product-manager:run` | `.claude/agents/product-manager.md` |
| `staff-software-engineer` | Full engineering pipeline: plan → dev → test → pr | `/sse:run` | `.claude/agents/staff-software-engineer.md` |

---

## Routing

When the user types a slash command, the entry point is unambiguous. When the user describes work in natural language, the main session consults this routing table:

| User intent | Route |
|---|---|
| "ship a new feature end-to-end" | `staff-software-engineer` (`/sse:run` full pipeline) |
| "draft a PRD" | `product-manager` → `/product-manager:prd` |
| "draft a PRP" | `product-manager` → `/product-manager:prp` |
| "full PM pipeline" | `product-manager` → `/product-manager:run` |
| "make the plan" | `/sse:plan` |
| "implement the plan" | `/sse:dev` |
| "run tests" | `/sse:test` |
| "open the PR" | `/sse:pr` |
| "continue the active pipeline" | `/pipeline:continue` |
| "abandon active feature" | `/pipeline:reset` |

**Rule of thumb:** if you know the agent, invoke directly. If you only know the intent, this table dispatches.

---

## Pipeline stages

Six gated stages, one feature: `prd → prp → plan → dev → test → pr`.

Each stage:
1. Writes a markdown artifact to `.claude/runtime/outputs/{pm,sse}/{stage}/{feature_id}.md`.
2. Triggers deterministic sensors (markdown rules + Python runner) on save.
3. Applies an LLM-judge eval rubric, retries on low score (up to 3).
4. On approval, records token spend per phase under `.claude/runtime/outputs/{pm,sse}/tokens/{feature_id}.json`.

Phase markers under `.claude/runtime/outputs/{pm,sse}/.markers/` track stage boundaries (`{feature}.{phase}.{start,end}`) for token accounting and pipeline status.

---

## Runtime (state, outputs, hooks)

Generated artifacts and lifecycle hooks live under `.claude/runtime/`.

| Path | Contents |
|---|---|
| `runtime/outputs/pm/{prd,prp,tokens,.markers}/` | PRD/PRP artifacts, token JSONs, phase markers |
| `runtime/outputs/sse/{plan,dev,test,pr,tokens,.markers}/` | Plan/dev/test/pr artifacts, token JSONs, phase markers |
| `runtime/hooks/<agent>/` | Per-agent lifecycle hooks (post-write, post-eval, pre-prp-check) |
| `runtime/scripts/<agent>/` | Per-agent utilities (sensor-runner, token-phase, link-validator, confluence-publish) |

`settings.json` `hooks` blocks reference these paths. `.claude/scripts/pipeline.py` reads/writes markers and outputs.

---

## Distribution

This repo is **harness-kit**, the source-of-truth template. Consumer repos install the harness via `setup/install.sh`, which copies:

- `AGENTS.md` and `CLAUDE.md` to the target root
- `.claude/agents/`, `.claude/commands/`, `.claude/hooks/`, `.claude/scripts/`, `.claude/conventions/` to the target `.claude/`
- `.claude/runtime/hooks/`, `.claude/runtime/scripts/` to the target (definition-side only; `outputs/`, `state/`, `.markers/` are runtime, not distributed)
- `.claude/settings.json` `hooks` block, merged with the consumer's existing settings

`setup/update.sh` migrates v3.x consumers (which have `.claude/plugins/`) to v4.x layout in place. v3.x consumers were the **plugin-shaped** distribution.

---

## Adding a new agent

1. Create `.claude/agents/<name>.md` (or `.claude/agents/<name>/agent.md` if bundled assets).
2. Register here under the right section.
3. If invocable via slash command, add `.claude/commands/<name>.md`.
4. If it needs lifecycle hooks, add under `.claude/runtime/hooks/<name>/` and wire in `.claude/settings.json`.

---

## See also

- [`CLAUDE.md`](./CLAUDE.md) — workspace context, style, role
- [`.claude/commands/`](./.claude/commands/) — slash command definitions
- [`setup/install.sh`](./setup/install.sh) — consumer installer
- [`setup/update.sh`](./setup/update.sh) — v3→v4 migration tool
