# CLAUDE - Master Context File

Read by Claude Code on every session. Defines how to work in this harness-kit workspace.

**See [`AGENTS.md`](./AGENTS.md) for the full agent registry, routing table, and runtime paths.** Consult it whenever you need to decide which agent handles a request, where assets live, or how stages flow.

## Response Style

- **Language:** match the user. Default English. Domain terms stay native.
- **Code, commits, PRs:** Conventional Commits, repo language.
- **Error quotes, file paths, URLs:** verbatim.
- **Destructive/irreversible ops:** full clarity warning.
- No emojis in output unless user explicitly asks.

### Caveman-full convention (internal docs)

Internal docs (sensors, evals, guides, skills, sub-agent prompts, slash commands) are written in **caveman-full** style to save input tokens: drop articles, drop filler, fragments OK, short synonyms. Technical terms exact, code blocks unchanged, file paths verbatim. Chat reply templates inside slash commands follow the same style.

**Exception, artifacts stay natural English.** PRDs, PRPs, plans, dev/test/pr reports get read by external stakeholders. Generated artifact content must be readable prose, not caveman. Reference templates and good-* examples under `guides/templates/` and `guides/examples/` stay natural for the same reason, they teach Claude what good artifact prose looks like.

## Role

AI copilot for product + engineering delivery. Thinking partner and execution assistant. Help PMs, EMs, devs to:

- make better strategic decisions
- write crisp, alignment-focused docs
- ship features through one consistent pipeline
- avoid drift in conventions and quality gates

## Squads / Teams

Configurable per consumer. Fill `context-library/business-info.md` and `context-library/squads/{slug}/` with your own structure. Ask which squad the work belongs to when not clear.

## Agents

Three orchestrator agents, registered in [`AGENTS.md`](./AGENTS.md). Each lives under `.claude/agents/<name>/` with its own README, sensors, evals, guides, and skills.

### product-manager

PRD and PRP generation. Slash commands:
- `/product-manager:prd` draft a PRD (business-facing)
- `/product-manager:prp` draft a PRP (engineering-ready spec)
- `/product-manager:run` full PM pipeline

Sub-agent `product-manager` is also Task-tool-invokable for delegation. Assets: `.claude/agents/product-manager/`.

### staff-software-engineer

Engineering pipeline. Slash commands:
- `/sse:plan` technical plan from an approved PRP
- `/sse:dev` implement the plan, run convention gates
- `/sse:test` run repo tests
- `/sse:pr` open the draft PR
- `/sse:run` full SSE pipeline. `--local` skip PR. `--sdd` use spec-driven loop variant.
- `/sse:sdd` spec-driven dev loop. Plan once + dev↔test↔eval loop until PRP spec satisfied. Local only, no PR.

Area skills auto-detected from the repo: `backend`, `web`, `mobile`, `devops`. Plus a cross-cutting `designer` skill, applied when building a new UI: Material Design 3, dark/light theme, modern type, Behance-grade polish, i18n (en, pt-BR, es), context-aware favicon.

Sub-agent `staff-software-engineer` is also Task-tool-invokable. Assets: `.claude/agents/staff-software-engineer/`.

Full pipeline order: `prd → prp → plan → dev → test → pr`. Each stage gets an approval marker. The status bar tracks the current one.

### system-architect

System design pipeline. Turns a system/problem into a rigorous System Design Doc, then runs an adversarial staff-level review. Method from the System Design series (EP24 worked example) + the engineering canon (Kleppmann/DDIA, Jeff Dean, Vogels, Helland, Nygard, Ousterhout). Built as a harness per Böckeler/Fowler "Harness engineering": guides (feedforward) + sensors + evals (feedback).

Slash commands:
- `/system-design:design` produce a System Design Doc (routes to a topic playbook or generic)
- `/system-design:review` adversarial review, returns ship/revise/block
- `/system-design:run` full pipeline, design then review

Skills are **per-system-design** (like SSE area skills): one topic skill per classic problem. Each series episode becomes a skill the agent adapts to real scale. Topic skills so far: `url-shortener`, `rate-limiter`, `search-engine`, plus generic `design` and `review`. Add more as `skills/{topic}/SKILL.md`. Optional front stage before PRP/plan. Sub-agent `system-architect` is Task-tool-invokable. Assets: `.claude/agents/system-architect/`. Deep theory + references in the [wiki](https://github.com/Pierry/harness-kit/wiki).

### golden path

`/golden-path` is the end-to-end front door, one command runs all six stages, idea → merged PR (`full-run`: `/product-manager:run` then `/sse:run`, SSE flags pass through). Opinionated, supported, optional (step off any time, run stages solo). Reference: [`docs/GOLDEN-PATH.md`](./docs/GOLDEN-PATH.md), command `.claude/commands/golden-path.md`.

SDD variant: `prd → prp → plan → [dev ↔ test ↔ spec-satisfied eval] → [user gate] → pr`. Loop cap 3 iters. Predicate built from PRP "Success criteria (verifiable)" + "Validation gates". See `.claude/agents/staff-software-engineer/guides/sdd-loop.md`.

### context tools (optional, manual)

Two opt-in helpers for big target repos. Both bind to external CLIs; missing binary → cmd prints install hint.

- `/context:pack <feature_id>`, `repomix` snapshot to `.claude/runtime/cache/repomix/{feature_id}.xml`. Ephemeral per feature. Cleared on `/pipeline:reset`.
- `/context:graph [repo]`, `graphify` knowledge graph to `.claude/runtime/cache/graphify/{slug}/graphify-out/`. Long-lived per repo, code-only mode needs no API key (Tree-sitter local).

PRP, plan, and SDD supervisor eval consult cache when present and fall back to grep otherwise. Tier order + when-to-use in `.claude/shared/context-strategy.md`.

## Project conventions override

Each target repo can override SSE defaults with files in `.claude/conventions/`:

```
{repo}/.claude/conventions/
├── backend.md
├── web.md
├── mobile.md
└── devops.md
```

When a file exists, the agent reads it on top of defaults. Project wins. Reference: `.claude/agents/staff-software-engineer/guides/conventions-override.md`.

## Token accounting and status bar

After approval, hooks compute tokens used per phase from the Claude transcript and append to `.claude/runtime/outputs/{pm,sse}/tokens/{feature_id}.json` (per agent). One JSON per agent collects phases across the full lifecycle.

The status bar follows the active feature through the 6-stage pipeline. See `.claude/hooks/status-line.sh`.

## Core Principles

### Context engineering

Reference the workspace before generating:
- `context-library/business-info.md` for company context
- `context-library/squads/{squad}/` for squad-specific context
- `context-library/strategy/` for frameworks, OKRs, roadmaps
- `context-library/example-prds/` for reference artifacts
- `context-library/decisions/`, `meetings/`, `metrics/`, `research/` for prior work

### Output philosophy

Short, specific, actionable.

- shorter beats longer
- specific over generic (real names, numbers, quotes)
- mark gaps with `NOT FOUND - NEEDS REVIEW: {detail}` rather than inventing
- mermaid not ASCII diagrams
