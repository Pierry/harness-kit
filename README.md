<div align="center">

# harness-kit

Claude Code harness for product + engineering delivery.
From idea to merged PR, one pipeline.

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](VERSION)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-8b5cf6.svg)](https://claude.ai/code)
[![Plugins](https://img.shields.io/badge/plugins-2-success.svg)](#layout)
[![Pipeline](https://img.shields.io/badge/stages-6-informational.svg)](#usage)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE)

<br/>

![harness-kit demo](demo/preview.gif)

<sub>85s walkthrough · install → 6 commands → PR. Each command scene shows the active **guide · ref · sensor · eval** with a footer status bar tracking the live skill, stage, and next slash command.</sub>

</div>

---

## Table of Contents

- [Getting Started](#getting-started)
  - [Install](#install)
  - [Update](#update)
  - [Usage](#usage)
  - [Workflow](#workflow)
  - [Samples](#samples)
- [Layout](#layout)
- [Project conventions](#project-conventions)
- [Anatomy of a stage](#anatomy-of-a-stage)
- [Status bar](#status-bar)
- [Tooling](#tooling)

---

## Getting Started

### Install

```bash
npm i -g @pieerry/harness-kit
hk install
```

`hk install` writes plugins into `.claude/plugins/`, drops the status-line hook in `.claude/hooks/`, generates `.claude/settings.json`, and scaffolds `.claude/conventions/` for your project overrides. Run it from the target repo (or pass an explicit `[target]`). Restart Claude Code after.

CLI subcommands:

| Command | What it does |
|---------|--------------|
| `hk install [target]` | install plugins into target repo (default: cwd) |
| `hk update [target]` | pull latest source and reinstall |
| `hk uninstall [target]` | remove plugins, hooks, settings, agents (keeps `outputs/` and `conventions/`) |
| `hk status [target]` | installed version + active pipeline stage |
| `hk version` | source version |

No-npm path (if you don't want a Node dep):

```bash
git clone https://github.com/Pierry/harness-kit ~/.harness-kit
bash ~/.harness-kit/setup/install.sh
```

### Update

```bash
hk update
```

Pulls latest source and reinstalls. Idempotent. Version is read from the package `VERSION` and recorded in your target at `.claude/.hk-version`.

### Usage

| Command | What it does |
|---------|--------------|
| `/product-manager:prd` | Draft a PRD |
| `/product-manager:prp` | Draft a PRP (needs an approved PRD) |
| `/product-manager:run` | Full PM pipeline (PRD then PRP) |
| `/sse:plan` | Generate plan from an approved PRP |
| `/sse:dev` | Implement the plan, run convention gates |
| `/sse:test` | Run the project test suite |
| `/sse:pr` | Open the draft PR |
| `/sse:run` | Full SSE pipeline (plan, dev, test, pr) |

Pipeline order: `prd → prp → plan → dev → test → pr`. Each stage gets an approval marker. The status bar tracks the current one.

### Workflow

PM session in this workspace:

```
$ /product-manager:run
> squad? billing
> problem? invoice generation fails for multi-currency customers
> ...
PRD saved at outputs/prd/2026-05-12-billing-multi-currency.md. Score: 8.6/10.
PRP saved at outputs/prp/2026-05-12-billing-multi-currency.md. Score: 8.4/10.
```

Engineering session in the target service repo:

```
$ /sse:run
> source PRP? outputs/prp/2026-05-12-billing-multi-currency.md
> area? backend
Plan saved at outputs/plan/2026-05-12-billing-multi-currency.md. Score: 8.3/10.
Dev complete. 5 files changed, 3 commits.
Tests: 24 passed, 0 failed.
PR opened: https://github.com/your-org/billing-service/pull/567
```

Token usage is logged per phase to a shared JSON across both plugins. See the [product-manager README](.claude/plugins/product-manager/README.md#token-accounting) for the schema and query examples.

### Samples

Reference artifacts ship inside the plugins:

- [good PRD example](.claude/plugins/product-manager/guides/examples/good-prd-example.md)
- [good PRP example](.claude/plugins/product-manager/guides/examples/good-prp-example.md)

---

## Layout

```
.
├── .claude/
│   ├── plugins/
│   │   ├── product-manager/          PRD + PRP plugin
│   │   └── staff-software-engineer/  plan, dev, test, pr plugin
│   ├── commands/                     slash commands per plugin namespace
│   ├── agents/                       Task-tool-invokable orchestrators
│   ├── hooks/
│   │   └── status-line.sh            pipeline status indicator
│   └── settings.json                 hooks wiring + permissions
├── context-library/                  reusable org/squad context
├── setup/
│   ├── install.sh                    target-repo installer
│   └── update.sh                     pull + reinstall
└── VERSION                           source of truth for installer
```

Plugin documentation:

- [product-manager](.claude/plugins/product-manager/README.md): PRD and PRP generation, sensor and eval gates, retry loop, token accounting, optional Confluence publish.
- [staff-software-engineer](.claude/plugins/staff-software-engineer/README.md): plan, dev, test, pr stages with per-project conventions override.

---

## Project conventions

Each target repo can override the SSE plugin defaults with its own files:

```
{repo}/.claude/conventions/
├── backend.md
├── web.md
├── mobile.md
└── devops.md
```

The installer scaffolds `.claude/conventions/README.md` to remind you of the contract. Fill only the area files relevant to the repo. Plugin reads them on top of its defaults. See [conventions-override.md](.claude/plugins/staff-software-engineer/guides/conventions-override.md) for the override mechanics and examples.

---

## Anatomy of a stage

Every stage in the pipeline runs the same loop. Same four ingredients, every time:

| Ingredient | What it is | Example |
|-----------|------------|---------|
| **guide** | How to write the artifact. Style + structure rules the LLM follows. | `prd-guidelines.md`, `coding-style.md` |
| **ref** | Context pulled in before drafting. Org/squad data + prior artifacts. | `business-info.md`, `outputs/prp/...md`, `.claude/conventions/backend.md` |
| **sensor** | Must-pass structural check. Blocks the stage from being approved. | `prd-structure`, `prp-links`, `code-conventions`, `test-coverage` |
| **eval** | Scored quality rubric. Returns a 0–10 score with diff suggestions. | `prd-quality`, `prp-context-readiness`, `plan-quality` |

Sensors are pass/fail (deterministic, fast). Evals are scored (LLM-judged, retried until ≥ threshold or max attempts). Approval markers (`<!-- approved: -->`) gate the next stage.

The 85s demo above shows every command running with these artifacts loading live on the right panel.

---

## Status bar

The status line follows the active feature through the 6-stage pipeline. Examples:

```
idle · start /product-manager:run or /sse:run
multi-currency · prd drafting · next /product-manager:prd
multi-currency · prd approved · prp pending · next /product-manager:prp
multi-currency · prp approved · plan pending · next /sse:plan
multi-currency · plan approved · dev pending · next /sse:dev
multi-currency · complete
```

State derives from artifact files plus the `<!-- approved: -->` marker. A feature is "active" when any of its artifacts was modified in the last hour. With no recent activity, the bar shows the idle prompt.

---

## Tooling

| Tool | Why |
|------|-----|
| [Claude Code](https://claude.ai/code) | the agent runtime |
| [git](https://git-scm.com/) | version control + status bar branch detection |
| [python3](https://www.python.org/) | sensor runner, token accounting, optional Confluence publish |
| [gh CLI](https://cli.github.com/) | install, update, opening PRs via `/sse:pr` |

Optional:

- [jq](https://stedolan.github.io/jq/) for querying the token JSON files
- `JIRA_USERNAME` and `JIRA_API_TOKEN` env vars to enable Confluence publish (details in the [product-manager README](.claude/plugins/product-manager/README.md#confluence-publish))
