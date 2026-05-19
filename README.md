<div align="center">

# harness-kit

Claude Code harness for product + engineering delivery.
From idea to merged PR, one pipeline.

[![Version](https://img.shields.io/badge/version-4.0.0-blue.svg)](VERSION)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-AGENTS.md-8b5cf6.svg)](https://claude.ai/code)
[![Agents](https://img.shields.io/badge/agents-2-success.svg)](#layout)
[![Pipeline](https://img.shields.io/badge/stages-6-informational.svg)](#usage)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE)

<br/>

![harness-kit demo](demo/preview.gif)

<sub>110s walkthrough · install → 6 commands → auto-watch PR until merged. Each command scene names its **guide · ref · sensor · eval**; final summary shows token spend per phase.</sub>

</div>

---

## What this is

harness-kit turns a target repo into a Claude Code workspace where **product and engineering share one pipeline**. You go from a problem statement to a merged PR through six gated stages — `prd → prp → plan → dev → test → pr` — each producing a markdown artifact, each gated by deterministic sensors and an LLM-judged eval, each accounting for its own token spend.

The pipeline is two Claude Code agents (`product-manager`, `staff-software-engineer`) registered in [`AGENTS.md`](./AGENTS.md), wired together by a small shell+python harness that tracks state, runs gates, and renders a live status bar. After a PR opens, an in-session monitor polls GitHub on backoff until the PR merges, then auto-clears state so the next feature starts clean.

**Who it's for:** PMs and engineers who want their `/`-commands to (1) produce real artifacts with named gates, (2) survive session restarts via persisted state, (3) record per-phase token spend so usage is auditable.

**What it's not:** a code generator, a CI replacement, or an opinionated agent framework. It's a thin harness that defers all model work to Claude Code and all VCS work to `git`/`gh`.

**Internal docs use caveman-full style** (drop articles + filler, fragments OK) to save input tokens — see [CLAUDE.md](CLAUDE.md). Generated artifacts (PRDs, PRPs, plans, dev/test/pr reports) stay natural English for external stakeholders. Reference templates and good-example artifacts are deliberately left in natural prose so produced docs inherit the right pattern.

---

## Table of Contents

- [Getting Started](#getting-started)
  - [Install](#install)
  - [Update](#update)
  - [Usage](#usage)
  - [Workflow](#workflow)
  - [Samples](#samples)
- [How it works](#how-it-works)
  - [Anatomy of a stage](#anatomy-of-a-stage)
  - [Sensors + evals matrix](#sensors--evals-matrix)
  - [Status bar](#status-bar)
  - [Live activity indicator](#live-activity-indicator)
  - [PR monitor](#pr-monitor)
  - [Token accounting](#token-accounting)
  - [Session-start auto-clear](#session-start-auto-clear)
- [Layout](#layout)
- [Project conventions](#project-conventions)
- [Tooling](#tooling)

---

## Getting Started

### Install

```bash
npm i -g @pieerry/harness-kit
hk install
```

`hk install` writes `AGENTS.md` + `CLAUDE.md` to the target root, installs agent definitions to `.claude/agents/` (`product-manager/`, `staff-software-engineer/` and their orchestrator `.md` files), per-agent runtime hooks and scripts to `.claude/runtime/`, root hooks to `.claude/hooks/` (status-line, pipeline tracking, activity tracker), state managers to `.claude/scripts/` (`pipeline.py`, `activity.py`, `pr-monitor.py`), slash commands under `.claude/commands/`, generates `.claude/settings.json`, and scaffolds `.claude/conventions/` for your project overrides. Run from the target repo or pass `[target]`. Restart Claude Code after.

**v3 → v4 migration:** if an existing `.claude/plugins/` tree is detected at the target, it is moved to `.claude/.legacy-v3-backup/plugins.<timestamp>/` before the v4 layout is laid down. Re-apply custom edits manually from the backup.

Reinstalling on top of an existing setup backs up the previous `settings.json` to `.claude/settings.json.bak.{timestamp}` before overwriting, so manual customizations are recoverable.

CLI subcommands:

| Command | What it does |
|---------|--------------|
| `hk install [target]` | install harness into target repo (default: cwd) |
| `hk update [target]` | pull latest source and reinstall (v3→v4 auto-backup) |
| `hk uninstall [target]` | remove agents, hooks, settings, scripts (keeps `outputs/`, `conventions/`, `CLAUDE.md`) |
| `hk status [target]` | installed version + active pipeline stage |
| `hk version` | source version |

No-npm path:

```bash
git clone https://github.com/Pierry/harness-kit ~/.harness-kit
bash ~/.harness-kit/setup/install.sh
```

### Update

For npm installs:

```bash
npm i -g @pieerry/harness-kit@latest
hk update
```

For git-clone installs:

```bash
hk update
```

`hk update` pulls latest source (git installs only) and reinstalls. Idempotent. Version is read from the package `VERSION` and recorded in your target at `.claude/.hk-version`. npm users must bump the package first — `hk update` alone won't reach the registry.

### Usage

| Command | What it does |
|---------|--------------|
| `/product-manager:prd` | Draft a PRD |
| `/product-manager:prp` | Draft a PRP (needs an approved PRD) |
| `/product-manager:run` | Full PM pipeline (PRD then PRP) |
| `/sse:plan` | Generate plan from an approved PRP |
| `/sse:dev` | Implement the plan, run convention + structure + quality gates |
| `/sse:test` | Run the project test suite + write a structured test report |
| `/sse:pr` | Open the draft PR, then auto-arm `pr-monitor` |
| `/sse:pr-monitor` | Watch the active PR for merge with backoff polling (auto-invoked by `/sse:pr`) |
| `/sse:run` | Full SSE pipeline (plan, dev, test, pr) |
| `/pipeline:continue` | Resume the active pipeline at its next pending stage |
| `/pipeline:reset` | Abandon the active pipeline run (clears state, keeps artifacts) |

Pipeline order: `prd → prp → plan → dev → test → pr`. Each stage gets an approval marker. Approval requires both the sensor gate (pass) and the eval gate (score ≥ 8.0).

You can enter the pipeline at any stage:

- `prd → prp → plan → dev → test → pr` (full PM + SSE)
- `prd → prp` (PM only, hand off to a separate engineering process)
- `plan → dev → test → pr` (SSE only, when discovery already happened elsewhere)

Status bar tracks the shape you started with. Close the session and reopen later — `/pipeline:continue` picks up at the next pending stage. `/pipeline:reset` clears the run if you decide to abandon it.

### Workflow

PM session in this workspace:

```
$ /product-manager:run
> squad? billing
> problem? invoice generation fails for multi-currency customers
> ...
PRD saved at outputs/prd/2026-05-12-billing-multi-currency.md.
  sensors: prd-structure ok, prd-acceptance-criteria ok
  eval:    prd-quality 8.6/10, prd-readiness 8.9/10
  guides:  prd-guidelines.md, writing-style.md, templates/prd.md
  refs:    business-info.md, squads/billing/context.md
  next:    /product-manager:prp

PRP saved at outputs/prp/2026-05-12-billing-multi-currency.md.
  sensors: prp-structure ok, prp-context-quality ok, prp-links ok
  eval:    prp-quality 8.4/10, prp-context-readiness 9.0/10
  guides:  prp-guidelines.md, templates/prp.md
  refs:    prd/2026-05-12-billing-multi-currency.md
  next:    /sse:plan (ready for handoff)
```

Engineering session in the target service repo:

```
$ /sse:run
> source PRP? outputs/prp/2026-05-12-billing-multi-currency.md
> area? backend
Plan saved at outputs/plan/2026-05-12-billing-multi-currency.md.
  sensors: plan-structure ok (problem, files, gates, scope)
  eval:    plan-quality 8.3/10
  guides:  pipeline.md, coding-style.md, skills/backend/SKILL.md
  refs:    prp/..., conventions/backend.md
  next:    /sse:dev

Dev complete. branch feat/PROJ-123-multi-currency.
  files changed: 5
  commits: 3 (a1b2c3d, d4e5f6g, h7i8j9k)
  sensors: code-conventions ok, test-coverage ok, dev-structure ok
  eval:    dev-quality 8.4/10
  guides:  coding-style.md, commit-style.md, skills/backend/SKILL.md
  next:    /sse:test

Tests passed.
  command:  ./mvnw test
  passed:   24, failed: 0
  duration: 12.4s
  sensors:  test-structure ok
  eval:     test-quality 8.7/10
  next:     /sse:pr

PR opened: https://github.com/your-org/billing-service/pull/567
  title:   feat(PROJ-123): timezone-aware deadline check
  draft:   yes
  sensors: pr-structure ok
  eval:    pr-quality 8.9/10

PR monitor armed for #567. First check in 3min, escalates to 30min cap.
```

Every reply names the actual sensors that ran, evals with scores, and guides loaded — no generic "ok" lines. The `/sse:run` and `/product-manager:run` summaries aggregate the same shape across phases, plus per-phase token totals from `.claude/runtime/outputs/{pm,sse}/tokens/{feature_id}.json`.

### Samples

Reference artifacts ship inside the agents:

- [good PRD example](.claude/agents/product-manager/guides/examples/good-prd-example.md)
- [good PRP example](.claude/agents/product-manager/guides/examples/good-prp-example.md)

---

## How it works

### Anatomy of a stage

Every stage in the pipeline runs the same loop. Same four ingredients, every time:

| Ingredient | What it is | Example |
|-----------|------------|---------|
| **guide** | How to write the artifact. Style + structure rules the LLM follows. | `prd-guidelines.md`, `coding-style.md` |
| **ref** | Context pulled in before drafting. Org/squad data + prior artifacts. | `business-info.md`, `outputs/prp/...md`, `.claude/conventions/backend.md` |
| **sensor** | Must-pass structural check. Deterministic, fast. Blocks approval. | `prd-structure`, `prp-links`, `dev-structure`, `test-structure`, `pr-structure`, `code-conventions`, `test-coverage` |
| **eval** | Scored quality rubric. LLM-judge, threshold 8.0, retried until pass or max attempts. | `prd-quality`, `prp-context-readiness`, `plan-quality`, `dev-quality`, `test-quality`, `pr-quality` |

Sensors are pass/fail. Evals are scored. Approval markers (`<!-- approved: -->`) gate the next stage. Token totals get appended as an inline `<!-- tokens: ... -->` reference after publish.

### Sensors + evals matrix

| Stage | Sensors (deterministic) | Eval (LLM-judge, ≥ 8.0) |
|-------|-------------------------|--------------------------|
| `prd` | `prd-structure`, `prd-acceptance-criteria` | `prd-quality`, `prd-readiness` |
| `prp` | `prp-structure`, `prp-context-quality`, `prp-links` | `prp-quality`, `prp-context-readiness` |
| `plan` | `plan-structure` | `plan-quality` |
| `dev` | `code-conventions`, `test-coverage`, `dev-structure` | `dev-quality` |
| `test` | `test-structure` | `test-quality` |
| `pr` | `pr-structure` | `pr-quality` |

Document sensors (`*-structure`) are auto-run by the post-write hook when the artifact lands on disk. Code sensors (`code-conventions`, `test-coverage`) are invoked by `/sse:dev` after each commit. Evals are scored by Claude inside the slash command. Convention: sensor files live at `.claude/agents/{agent}/sensors/{phase}-*.md`; evals at `.claude/agents/{agent}/evals/{phase}-quality.md`.

### Status bar

The status line follows the active feature through whatever pipeline shape you started. It is dynamic: a `UserPromptSubmit` hook records intent the moment you type a slash command, and `PostToolUse` hooks update state as artifact files land on disk.

```
idle · /product-manager:run · /sse:run · /pipeline:continue
starting sse-run [plan+dev+test+pr] · plan pending · next /sse:plan
multi-currency [plan+dev+test+pr] · plan drafting · next /sse:plan · sensor: plan-structure
multi-currency [plan+dev+test+pr] · plan approved · dev pending · next /sse:dev
multi-currency [prd+prp+plan+dev+test+pr] · prp approved · plan drafting · next /sse:plan
multi-currency · complete (prd+prp+plan+dev+test+pr)
```

The bracketed list is the pipeline shape — the stages this run will execute. The shape is inferred from the slash command you invoked and extended when you chain commands (e.g. running `/sse:run` after `/product-manager:run` appends `plan+dev+test+pr` to the existing `prd+prp`).

State lives at `.claude/.pipeline-state.json`. Close the session and reopen — the `SessionStart` hook prints a one-line resume hint, and `/pipeline:continue` invokes the next pending stage. `/pipeline:reset` clears the file. Output artifacts under `.claude/runtime/outputs/{pm,sse}/` are never deleted by reset.

### Live activity indicator

While Claude is reading a sensor, eval, or guide, the status bar appends a cyan tag with the file being touched:

```
multi-currency [plan+dev+test+pr] · plan drafting · next /sse:plan · sensor: plan-structure
multi-currency [plan+dev+test+pr] · dev drafting · next /sse:dev · guide: coding-style
multi-currency [plan+dev+test+pr] · plan drafting · next /sse:plan · eval: plan-quality
```

Mechanism: a `PreToolUse` Read hook (`activity-pre-read.sh`) detects when Claude reads a file under `.claude/agents/*/sensors/`, `.claude/agents/*/evals/`, or `.claude/agents/*/guides/` and writes the activity to `.claude/.activity` with a 60s TTL. The status-line reads it on each render and clears stale entries. The Claude Code top-of-screen "thinking…" indicator is rendered by the CLI itself and cannot be augmented; the bottom status bar is the available channel.

### PR monitor

After `/sse:pr` opens a PR, it auto-invokes `/sse:pr-monitor`, which polls `gh pr view --json state` on backoff and stays in the session until the PR transitions out of `OPEN`.

| Rung | Interval | Attempts | Cumulative |
|------|----------|----------|------------|
| 1 | 3 min | 5 | 15 min |
| 2 | 6 min | 5 | 45 min |
| 3 | 12 min | 5 | 1h 45m |
| 4 | 24 min | 5 | 3h 45m |
| 5 (cap) | 30 min | ∞ | until merged/closed |

On `MERGED`: notifies and clears both `.pipeline-state.json` and `.pr-monitor-state.json`. On `CLOSED` without merge: stops cleanly. Mechanism: `ScheduleWakeup` in the active session — closing the session ends the monitor.

State: `.claude/.pr-monitor-state.json` records PR number, URL, branch, current interval, and attempt counts.

### Token accounting

Every phase has its own start/end marker written to `.claude/runtime/outputs/{pm,sse}/.markers/{feature_id}.{phase}-{generate|validate}.{start|end}`. When the artifact is approved, the post-eval hook runs `.claude/runtime/scripts/<agent>/token-phase.py` for both phases — it reads the Claude session transcript JSONL, sums input/output/cache-read/cache-creation tokens within each window, and appends an entry to `.claude/runtime/outputs/{pm,sse}/tokens/{feature_id}.json`.

Schema:

```json
{
  "feature_id": "2026-05-12-billing-multi-currency",
  "files": { "prd": ".claude/runtime/outputs/pm/prd/...md", "prp": ".claude/runtime/outputs/pm/prp/...md" },
  "phases": [
    { "phase": "prd-generate", "started_at": "...", "ended_at": "...", "tokens": { "input": 1234, "output": 567, "cache_read": 8910, "cache_creation": 234 }, "attempts": 1 }
  ],
  "totals": { "input": 0, "output": 0, "cache_read": 0, "cache_creation": 0 }
}
```

Each agent keeps its own `.claude/runtime/outputs/{pm,sse}/tokens/{feature_id}.json`. The artifact gets an inline `<!-- tokens: ... in=N out=N cache_r=N -->` reference appended after approval so the totals are visible from the artifact itself. Query examples in the [product-manager README](.claude/agents/product-manager/README.md#token-accounting).

### Session-start auto-clear

When you reopen a session on a branch whose PR is `MERGED` or `CLOSED` and the pipeline state still has `feature_id: null` (i.e. the run was never linked to a feature), the `SessionStart` hook auto-clears `.pipeline-state.json` and prints:

```
previous feature shipped (PR #271 MERGED). pipeline state cleared.
start next with /product-manager:run or /sse:run
```

This avoids the stale `next /sse:plan` nag after work has already shipped.

---

## Layout

```
.
├── AGENTS.md                          agent registry + routing
├── CLAUDE.md                          workspace context
├── .claude/
│   ├── agents/
│   │   ├── product-manager/           PRD + PRP definitions (sensors, evals, guides, skills)
│   │   ├── staff-software-engineer/   plan/dev/test/pr definitions (sensors, evals, guides, skills)
│   │   ├── product-manager.md         orchestrator agent file
│   │   └── staff-software-engineer.md orchestrator agent file
│   ├── commands/                      slash commands per namespace
│   ├── hooks/
│   │   ├── status-line.sh             pipeline status indicator (with cyan activity)
│   │   ├── pipeline-prompt.sh         slash-command intent tracking
│   │   ├── pipeline-postwrite.sh      stage-state from artifact writes
│   │   ├── pipeline-postedit.sh       stage-state from approval marker
│   │   ├── pipeline-session-start.sh  resume hint + PR-merged auto-clear
│   │   └── activity-pre-read.sh       surfaces current sensor/eval/guide
│   ├── scripts/
│   │   ├── pipeline.py                pipeline state CRUD
│   │   ├── activity.py                live activity CRUD (60s TTL)
│   │   ├── pr-monitor.py              PR-watch state + backoff schedule
│   │   └── stage-card.md              header/footer card convention
│   ├── runtime/
│   │   ├── hooks/<agent>/             per-agent lifecycle hooks (post-write, post-eval, pre-prp-check)
│   │   ├── scripts/<agent>/           per-agent utilities (sensor-runner, token-phase, link-validator)
│   │   └── outputs/{pm,sse}/          generated artifacts, markers, tokens
│   ├── conventions/                   per-repo overrides
│   ├── .pipeline-state.json           active feature + per-stage state
│   ├── .pr-monitor-state.json         PR being watched
│   ├── .activity                      current sensor/eval/guide being touched
│   └── settings.json                  hooks wiring + permissions
├── context-library/                   reusable org/squad context
├── setup/
│   ├── install.sh                     target-repo installer (with v3→v4 backup)
│   └── update.sh                      pull + reinstall
└── VERSION                            source of truth for installer
```

Agent documentation:

- [product-manager](.claude/agents/product-manager/README.md): PRD and PRP generation, sensor and eval gates, retry loop, token accounting, optional Confluence publish.
- [staff-software-engineer](.claude/agents/staff-software-engineer/README.md): plan, dev, test, pr stages with per-project conventions override, document + code sensors, quality evals, PR monitor.

---

## Project conventions

Each target repo can override the SSE agent defaults with its own files:

```
{repo}/.claude/conventions/
├── backend.md
├── web.md
├── mobile.md
└── devops.md
```

The installer scaffolds `.claude/conventions/README.md` to remind you of the contract. Fill only the area files relevant to the repo. The agent reads them on top of its defaults. See [conventions-override.md](.claude/agents/staff-software-engineer/guides/conventions-override.md) for the override mechanics and examples.

---

## Tooling

| Tool | Why |
|------|-----|
| [Claude Code](https://claude.ai/code) | the agent runtime |
| [git](https://git-scm.com/) | version control + status bar branch detection |
| [python3](https://www.python.org/) | sensor runner, token accounting, pipeline state, activity tracker, PR monitor |
| [gh CLI](https://cli.github.com/) | install, update, opening PRs via `/sse:pr`, polling merge via `/sse:pr-monitor` |

Optional:

- [jq](https://stedolan.github.io/jq/) for querying the token JSON files
- `JIRA_USERNAME` and `JIRA_API_TOKEN` env vars to enable Confluence publish (details in the [product-manager README](.claude/agents/product-manager/README.md#confluence-publish))
