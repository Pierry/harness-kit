<div align="center">

# harness-kit

From idea to merged PR. One pipeline. Six stages. Or spec-driven loop until the spec is met.

[![Version](https://img.shields.io/badge/version-4.1.0-blue.svg)](VERSION)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-AGENTS.md-8b5cf6.svg)](https://claude.ai/code)
[![Agents](https://img.shields.io/badge/agents-2-success.svg)](#agents)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE)

<br/>

![harness-kit demo](demo/preview.gif)

<sub>70s walkthrough · what it is · install · <code>@agent</code> mentions · the golden path · how to use it (brief → <code>/golden-path</code> → merged PR). Based on Claude Code <code>/goal</code> pattern.</sub>

</div>

---

## What it is

Two Claude Code agents — `product-manager` and `staff-software-engineer` — sharing one pipeline:

```
prd → prp → plan → dev → test → pr
```

Each stage produces a markdown artifact, gated by **deterministic sensors** (pass/fail) and a **scored eval** (≥ 8.0). After the PR opens, an in-session monitor watches for merge.

For local-only work, two extra modes skip the PR stage:

```
/sse:run --local          plan → dev → test → STOP            (single shot, no loop)
/sse:sdd                  plan → [dev↔test↔eval]×3 → STOP     (spec-driven goal loop)
```

`/sse:sdd` is the SDD variant: the PRP is the spec, and an independent supervisor session re-checks the repo against `Success criteria (verifiable)` + `Validation gates` after every dev↔test iteration. PR is never auto-opened — user runs `/sse:pr` after reviewing the loop transcript.

---

## Install

Through the Claude Code plugin marketplace:

```
/plugin marketplace add Pierry/harness-kit
/plugin install harness-kit@harness-kit
/harness-kit:install
```

The plugin is a bootstrap — `/harness-kit:install` lays the full harness into your project (agents, commands, skills, hooks, status bar). Restart Claude Code. Done.

Update later: `/plugin update harness-kit` then `/harness-kit:update`.

---

## Getting started

Pick the flow that matches the task. All of them share the same pipeline state, so you can switch between them mid-feature.

### The golden path — idea to merged PR

The paved route for a feature with stakes, ambiguity, or a Jira ticket attached. Three steps from a raw idea to a merged PR:

**1. Write the brief.** Open the **[idea-brief builder](https://pierry.github.io/harness-kit/brief/)** and fill the fields in-standard — squad, problem, hypothesis, customers, metric. Inline validation keeps you to the PRD conventions (problem ≤ 2 sentences, hypothesis as *if / then / because*, metrics with baseline + target + horizon).

**2. Copy + paste.** Hit **Copy brief**. It hands you a paste-ready `/golden-path` kick with your idea as structured context. Paste it into Claude Code:

```
/golden-path

Squad: checkout
Problem: Returning guests abandon checkout when a card is declined once …
Hypothesis: If we add one-tap retry, then completion rises 5 points, because …
Customers:
- Returning guests — lose the cart on a one-off decline
Success metric: checkout completion rate — from 71% to 76% within 30 days
```

**3. Approve and ship.** `/golden-path` runs all six gated stages — PM (`prd → prp`) then Eng (`plan → dev → test → pr → monitor`). Approve each artifact when prompted; the status bar tracks where you are. Pass SSE flags straight through: `/golden-path --local`, `--sdd`, `--no-monitor`.

Already know the idea cold? Skip the builder and type `/golden-path` with the brief yourself — or drive each half: `/product-manager:run` then `/sse:run`. You can step off the path any time and run any stage solo (`/sse:plan`, `/sse:dev`, …). Full reference: [`docs/GOLDEN-PATH.md`](docs/GOLDEN-PATH.md).

### Spec only — no code yet

You need the PRD and PRP to align with stakeholders before any engineering work. Stop after the PRP.

```
/product-manager:run
```

When eng is ready, hand them the repo and they run `/sse:run` against the approved PRP.

### Dev only — small change, plan in your head

A bug fix, a small enhancement, or a refactor where writing a PRD would be theatre. Skip PM, run engineering directly.

```
/sse:run                 # plan → dev → test → PR
/sse:run --local         # plan → dev → test, stop before PR (push manually later)
```

Or run a single stage if that's all you need:

```
/sse:plan                # just the plan
/sse:dev                 # just the code (against an approved plan)
/sse:test                # just the tests
/sse:pr                  # just open the PR
```

### Spec-driven loop — iterate locally until the PRP is satisfied

You have an approved PRP and want Claude to loop dev↔test until the spec actually passes, judged by an independent supervisor session. No PR until you say so.

```
/sse:sdd                 # plan once + dev↔test↔spec-satisfied eval, cap 3 iters
# review .claude/runtime/outputs/sse/sdd/{feature_id}.md
/sse:pr                  # manual gate when ready
```

The loop predicate is built from the PRP's `Success criteria (verifiable)` and `Validation gates` sections — both must be present and concrete, or the `prp-has-acceptance-criteria` sensor blocks before the first iteration runs. Cap hit without a PASS verdict returns a blocker listing the unmet criteria.

### Resume — pick up where you left off

Closed the session, restarted Claude Code, or got interrupted. State persists at `.claude/.pipeline-state.json`.

```
/pipeline:continue       # next pending stage for the active feature
/pipeline:reset          # abandon the active run and start fresh
```

When the PR merges, the in-session monitor clears state automatically.

---

## Use it

```
/product-manager:run           draft PRD then PRP
/sse:run                       plan, dev, test, open PR, watch for merge
/sse:run --local               plan, dev, test — stop before PR
/sse:sdd                       spec-driven loop: dev↔test↔eval until PRP met, no PR
/context:pack <feature_id>     repomix snapshot of target repo (per-feature cache)
/context:graph [repo]          graphify knowledge graph of a target repo (per-repo cache)
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
| `sdd` | `/sse:sdd` | `prp-has-acceptance-criteria` (pre-flight) · `spec-satisfied` per iter (fresh session) · cap 3 iters |

Sensors block on failure (Claude regenerates). Evals score; threshold 8.0; retried up to 3 times. SDD eval returns PASS/FAIL — FAIL re-enters the loop with a `next_iter_focus` hint.

---

## Agents

Registered in [`AGENTS.md`](./AGENTS.md) at the repo root. Each ships its own sensors, evals, guides, skills.

### `product-manager` — turns a problem into an engineering-ready spec

- Skills: `prd`, `prp`
- Sensors: 5 (structure + acceptance criteria + cross-links)
- Evals: 4 (quality + readiness for each of PRD, PRP)
- Guides: `pipeline.md`, `prd-guidelines.md`, `prp-guidelines.md`, `writing-style.md`, `templates/`, `examples/`
- [Full docs →](.claude/agents/product-manager/README.md)

### `staff-software-engineer` — turns an approved PRP into a merged PR (or a satisfied spec)

- Skills: `backend`, `web`, `mobile`, `devops` (auto-detected from repo)
- Sensors: 7 (`plan-structure`, `code-conventions`, `test-coverage`, `dev-structure`, `test-structure`, `pr-structure`, `prp-has-acceptance-criteria`)
- Evals: 5 (`plan`, `dev`, `test`, `pr` quality; `spec-satisfied` supervisor for SDD loop)
- Guides: `pipeline.md`, `coding-style.md`, `commit-style.md`, `conventions-override.md`, `sdd-loop.md`
- Modes: `/sse:run` (full pipeline), `/sse:run --local` (skip PR), `/sse:sdd` (spec-driven loop)
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

What `/harness-kit:install` lays down in your repo:

```
{your-repo}/
├── AGENTS.md                    agent registry + routing
├── CLAUDE.md                    workspace style + role
└── .claude/
    ├── agents/                  agent definitions (sensors, evals, guides, skills)
    ├── commands/                slash command entry points (pm, sse, context, pipeline)
    ├── shared/                  cross-agent guides (context-strategy.md)
    ├── hooks/                   status-line + lifecycle hooks
    ├── scripts/                 pipeline.py · activity.py · pr-monitor.py · pack-repo.sh · graph-repo.sh
    ├── runtime/
    │   ├── hooks/<agent>/       per-agent lifecycle (post-write, post-eval, pre-prp-check)
    │   ├── scripts/<agent>/     per-agent utilities (sensor-runner, token-phase, link-validator)
    │   ├── outputs/{pm,sse}/    generated artifacts, markers, tokens (incl. sse/sdd/ loop transcripts)
    │   └── cache/               repomix packs + graphify graphs (optional, gitignored)
    ├── conventions/             your per-repo overrides
    └── settings.json            hook wiring
```

Full path-by-path map in [`AGENTS.md`](./AGENTS.md).

---

## Tooling

| Tool | Why | Required |
|------|-----|----------|
| [Claude Code](https://claude.ai/code) | agent runtime | yes |
| python3 | sensors, token accounting, pipeline state | yes |
| [gh CLI](https://cli.github.com/) | opens PR, polls for merge | for `/sse:pr` |
| git | branch + commit ops | yes |
| [repomix](https://repomix.com) | snapshot target repo for AI context (`/context:pack`) | optional |
| [graphify](https://github.com/safishamsi/graphify) | queryable knowledge graph of a repo (`/context:graph`) | optional |

Install optional tools:

```bash
npm i -g repomix           # or: brew install repomix
uv tool install graphifyy  # or: pipx install graphifyy   (CLI cmd is `graphify`)
```

The installer detects both and prints a hint if missing — never auto-installs. See [`.claude/shared/context-strategy.md`](.claude/shared/context-strategy.md) for when each tier is worth it (grep vs pack vs graph).

Other optional: `jq` for token JSON queries. `JIRA_USERNAME` + `JIRA_API_TOKEN` to publish PRD/PRP to Confluence.

---

MIT. Built on [Claude Code](https://claude.ai/code). Works in any repo Claude Code touches.
