<div align="center">

# harness-kit

From idea to merged PR. One pipeline. Six stages.

[![Version](https://img.shields.io/badge/version-4.0.0-blue.svg)](VERSION)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-AGENTS.md-8b5cf6.svg)](https://claude.ai/code)
[![Agents](https://img.shields.io/badge/agents-2-success.svg)](#agents)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE)

<br/>

![harness-kit demo](demo/preview.gif)

<sub>~2min walkthrough · agents · skills · install · 6 commands · sensors+evals matrix · auto-watch PR until merged.</sub>

</div>

---

## What it is

Two Claude Code agents — `product-manager` and `staff-software-engineer` — sharing one pipeline:

```
prd → prp → plan → dev → test → pr
```

Each stage produces a markdown artifact, gated by **deterministic sensors** (pass/fail) and a **scored eval** (≥ 8.0). After the PR opens, an in-session monitor watches for merge.

---

## Install

```bash
npm i -g @pieerry/harness-kit
hk install
```

Restart Claude Code. Done.

Without npm:

```bash
git clone https://github.com/Pierry/harness-kit ~/.harness-kit
bash ~/.harness-kit/setup/install.sh
```

CLI: `hk install` · `hk update` · `hk uninstall` · `hk status` · `hk version`.

---

## Use it

```
/product-manager:run           draft PRD then PRP
/sse:run                       plan, dev, test, open PR, watch for merge
/pipeline:continue             resume next pending stage
/pipeline:reset                abandon active run
```

Need just one stage? Each is its own slash command:

| Stage | Command | Gates |
|---|---|---|
| `prd` | `/product-manager:prd` | `prd-structure`, `prd-acceptance-criteria` · `prd-quality`, `prd-readiness` |
| `prp` | `/product-manager:prp` | `prp-structure`, `prp-context-quality`, `prp-links`, `link-validator` · `prp-quality`, `prp-context-readiness` |
| `plan` | `/sse:plan` | `plan-structure` · `plan-quality` |
| `dev` | `/sse:dev` | `code-conventions`, `test-coverage`, `dev-structure` · `dev-quality` |
| `test` | `/sse:test` | `test-structure` · `test-quality` |
| `pr` | `/sse:pr` | `pr-structure` · `pr-quality` · auto-arms `/sse:pr-monitor` |

Sensors block on failure (Claude regenerates). Evals score; threshold 8.0; retried up to 3 times.

---

## Agents

Registered in [`AGENTS.md`](./AGENTS.md) at the repo root. Each ships its own sensors, evals, guides, skills.

### `product-manager` — turns a problem into an engineering-ready spec

- Skills: `prd`, `prp`
- Sensors: 5 (structure + acceptance criteria + cross-links)
- Evals: 4 (quality + readiness for each of PRD, PRP)
- Guides: `pipeline.md`, `prd-guidelines.md`, `prp-guidelines.md`, `writing-style.md`, `templates/`, `examples/`
- [Full docs →](.claude/agents/product-manager/README.md)

### `staff-software-engineer` — turns an approved PRP into a merged PR

- Skills: `backend`, `web`, `mobile`, `devops` (auto-detected from repo)
- Sensors: 6 (`plan-structure`, `code-conventions`, `test-coverage`, `dev-structure`, `test-structure`, `pr-structure`)
- Evals: 4 (`plan`, `dev`, `test`, `pr` quality)
- Guides: `pipeline.md`, `coding-style.md`, `commit-style.md`, `conventions-override.md`
- [Full docs →](.claude/agents/staff-software-engineer/README.md)

---

## Anatomy of every stage

```
GUIDE       how to write it           pipeline.md · coding-style.md
REF         context to pull in        AGENTS.md · prp/<feature>.md · conventions/{area}.md
SENSOR      must-pass structure       deterministic, blocks approval
EVAL        scored rubric             LLM-judge, threshold 8.0
```

Approval marker (`<!-- approved: -->`) gates the next stage. Token spend per phase appended as inline `<!-- tokens: ... -->`.

---

## Status bar

Live indicator at the bottom of every Claude Code session:

```
idle · /product-manager:run · /sse:run · /pipeline:continue
billing-fix [prd+prp+plan+dev+test+pr] · prp approved · plan drafting · next /sse:plan · sensor: plan-structure
billing-fix · complete (prd/prp/plan/dev/test/pr)
```

State persists at `.claude/.pipeline-state.json`. Close the session and reopen — `/pipeline:continue` picks up at the next pending stage. When the PR merges, state auto-clears.

---

## Project conventions

The SSE agent has defaults per area. Override per repo:

```
{your-repo}/.claude/conventions/{backend,web,mobile,devops}.md
```

Only the area files you need. The agent reads them on top of defaults. See [`conventions-override.md`](.claude/agents/staff-software-engineer/guides/conventions-override.md).

---

## Layout

What `hk install` lays down in your repo:

```
{your-repo}/
├── AGENTS.md                    agent registry + routing
├── CLAUDE.md                    workspace style + role
└── .claude/
    ├── agents/                  agent definitions (sensors, evals, guides, skills)
    ├── commands/                slash command entry points
    ├── hooks/                   status-line + lifecycle hooks
    ├── scripts/                 pipeline.py · activity.py · pr-monitor.py
    ├── runtime/
    │   ├── hooks/<agent>/       per-agent lifecycle (post-write, post-eval, pre-prp-check)
    │   ├── scripts/<agent>/     per-agent utilities (sensor-runner, token-phase, link-validator)
    │   └── outputs/{pm,sse}/    generated artifacts, markers, tokens
    ├── conventions/             your per-repo overrides
    └── settings.json            hook wiring
```

Full path-by-path map in [`AGENTS.md`](./AGENTS.md).

---

## Tooling

| Tool | Why |
|------|-----|
| [Claude Code](https://claude.ai/code) | agent runtime |
| python3 | sensors, token accounting, pipeline state |
| [gh CLI](https://cli.github.com/) | opens PR, polls for merge |
| git | branch + commit ops |

Optional: `jq` for token JSON queries. `JIRA_USERNAME` + `JIRA_API_TOKEN` to publish PRD/PRP to Confluence.

---

MIT. Built on [Claude Code](https://claude.ai/code). Works in any repo Claude Code touches.
