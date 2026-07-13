<div align="center">

# harness-kit

**Idea to merged PR, through one gated pipeline.**

Claude Code agents, a product manager, a staff engineer, and a system architect, that carry a raw
idea through `prd → prp → plan → dev → test → pr`, with a pass/fail check and a scored review at every stage.

[![Version](https://img.shields.io/badge/version-5.0.0-blue.svg)](VERSION)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-8b5cf6.svg)](https://claude.ai/code)
[![Stars](https://img.shields.io/github/stars/Pierry/harness-kit?style=flat&color=f5c518)](https://github.com/Pierry/harness-kit/stargazers)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE)

<br/>

![harness-kit demo](demo/preview.gif)

<sub>~90s walkthrough, what it is, install, the three agents, the golden path, how each stage is gated, idea to merged PR.</sub>

</div>

---

## The four fronts

harness-kit is one product with four surfaces. Each does one job, and they chain: shape the idea,
run the pipeline, watch its quality, drive it from a terminal. Start anywhere.

| | Front | What it does | Where |
|---|---|---|---|
| **1** | [**Brief builder**](#1-brief-builder--turn-an-idea-into-the-prompt) | A web app that turns your idea into a paste-ready `/golden-path` prompt, with inline validation. | [Open it →](https://pierry.github.io/harness-kit/brief/) |
| **2** | [**The pipeline**](#2-the-pipeline--idea-to-merged-pr) | The agents and the gated flow. Carries the idea `prd → prp → plan → dev → test → pr`. | Claude Code |
| **3** | [**Quality dashboard**](#3-quality-dashboard--is-each-stage-getting-better) | Tracks each stage's eval score, gaps, and sensor failures across every run over time. | [Open it →](https://pierry.github.io/harness-kit/quality/phase-report.html) |
| **4** | [**The cockpit**](#4-the-cockpit--drive-it-from-the-terminal) | A terminal UI over the pipeline, every stage live, a stage run on a keypress, gates as prompts. | `hk-tui` |

Front 2 is the engine. Front 1 feeds it, front 3 measures it, front 4 drives it. The rest of this
page is one section per front, then install and the deeper docs.

---

## 1. Brief builder — turn an idea into the prompt

The on-ramp. A single web page that turns a rough idea into a well-formed `/golden-path` prompt:
you fill squad, problem, hypothesis, and metric, it validates each field against the PRD conventions
as you type, and it builds the exact prompt to paste into Claude Code. No blank-page problem.

![brief builder](docs/media/brief.gif)

**[Open the idea-brief builder →](https://pierry.github.io/harness-kit/brief/)**

Fill the fields, watch the live preview assemble the prompt on the right, hit **Copy brief**, and paste:

```
/golden-path

Squad: checkout
Problem: Returning guests abandon checkout when a card is declined once …
Hypothesis: If we add one-tap retry, then completion rises 5 points, because …
Success metric: checkout completion, from 71% to 76% within 30 days
```

Already know the idea cold? Skip the builder and type `/golden-path` with the brief yourself.

---

## 2. The pipeline — idea to merged PR

The engine. Two agents carry a feature through six gated stages, and every stage produces a markdown
artifact that must pass a check before it advances.

```mermaid
flowchart LR
    idea([idea]) --> prd
    subgraph PM[product-manager]
        prd --> prp
    end
    subgraph SSE[staff-software-engineer]
        plan --> dev --> test --> pr
    end
    prp --> plan
    pr --> merged([merged PR])
```

Shipping a feature on vibes skips the parts that make it correct: framing the problem, writing
acceptance criteria, holding the conventions, gating the review. harness-kit puts those back,
without you hand-writing a single doc. After the PR opens, an in-session monitor watches for merge
and clears state on its own.

### How one stage is gated

The same loop runs at every stage. The agent generates the artifact, a **sensor** checks its
structure deterministically, an **eval** scores its quality with an LLM judge, and only then does a
human approve. Failures self-correct before they reach you.

```mermaid
flowchart LR
    gen[generate artifact] --> sensor{sensor<br/>structure check}
    sensor -->|fail| gen
    sensor -->|pass| eval{eval<br/>LLM judge}
    eval -->|score &lt; 8.0, retry ×3| gen
    eval -->|score ≥ 8.0| approve[human approves]
    approve --> next([next stage])
```

This is the harness-engineering split: **guides** steer before (feedforward), **sensors** give
deterministic feedback, **evals** give inferential feedback, and humans stay *on* the loop, improving
the guides and gates rather than hand-fixing each output. See [Foundations](#foundations).

### Run it: the golden path

One command, idea to merged PR. Paste the brief from front 1 (or write it yourself) and approve each
artifact when prompted; the status bar tracks where you are.

```
/golden-path

Squad: checkout
Problem: …
Hypothesis: …
Success metric: …
```

### Other ways to run

Every flow shares the same pipeline state, so you can switch between them mid-feature.

| You want | Run | Stages |
|---|---|---|
| Hands-off, idea to PR, two gates | `/pipeline:run "<idea>"` | `intake → prd → … → pr` |
| Idea to merged PR, approve each | `/golden-path` | `prd → prp → plan → dev → test → pr` |
| Spec only, align before any code | `/product-manager:run` | `prd → prp` |
| Small change, plan in your head | `/sse:run` | `plan → dev → test → pr` |
| Local only, no PR | `/sse:run --local` | `plan → dev → test` |
| Loop until the spec passes | `/sse:sdd` | `plan → [dev↔test↔eval] ×3` |
| Resume after a break | `/pipeline:continue` | next pending stage |

Each stage is also its own command, `/sse:plan`, `/sse:dev`, `/sse:test`, `/sse:pr`. `/sse:dev` asks
once whether to apply the designer skill when the work has UI. To ship a finished static site,
`/sse:firebase-publish` creates or reuses a Firebase project and deploys Hosting.

**[Every command and every gate →](docs/COMMANDS.md)** · **[Golden path reference →](docs/GOLDEN-PATH.md)**

---

## 3. Quality dashboard — is each stage getting better?

The feedback surface. Scores used to get lost in chat once a stage was approved. The quality
dashboard persists per-phase signal across every run and answers one question: **is each stage
getting better or worse over time?**

![quality dashboard](docs/media/quality.gif)

**[Open the dashboard →](https://pierry.github.io/harness-kit/quality/phase-report.html)** (click
**Load sample** to explore with synthetic data).

Every time a phase is approved, a post-eval hook appends one deterministic entry, zero token cost, to
`.claude/runtime/outputs/quality/phase-log.json`:

| field | source |
|---|---|
| `score` | eval score parsed from the approval marker |
| `gaps` | count of `NOT FOUND - NEEDS REVIEW` markers left in the artifact |
| `sensors` | the stage sensors re-run against the artifact (pass/fail) |
| `status` | derived: `failed` (sensor blocked) / `degraded` (score < 7 or gaps > 0) / `ok` |

Drop that JSON on the page (a standalone file, no build, no network) and it renders KPI tiles, a score
trend by stage, failure rate by stage, average score vs the 7.0 threshold, the sensors that block
most, and the full run table. Material Design 3, dark and light, three locales.
[More →](docs/quality/README.md)

---

## 4. The cockpit — drive it from the terminal

The control surface. A terminal UI over the pipeline. It shows every stage live, renders each
artifact, runs a stage on a keypress, and turns the two human gates into modal prompts. It reads
pipeline state and artifacts straight off disk, so it stays in sync with any Claude Code session
driving the same feature.

![the cockpit](docs/media/cockpit.gif)

```
npm i -g @pieerry/harness-kit   # once; puts hk, harness-kit, hk-tui on your PATH

hk-tui                     # open the cockpit in the current repo
hk-tui path/to/repo        # or point it at one
hk-tui -- "add one-tap retry to checkout"   # seed the idea for intake
hk cockpit                 # same thing via the main CLI
```

| Key | Action |
|---|---|
| `↑ ↓` / `j k` | move between stages |
| `enter` | run the selected stage (`claude -p`), output tails in the pane |
| `tab` | focus the artifact reader, scroll with `j k` / space |
| `a` | at a gate: approve and continue · `x`: hold |
| `r` | refresh · `q`: quit |

The cockpit ships **bundled** with harness-kit (a single file, no extra dependencies land in your
project), so `hk-tui` works the moment the package is installed. It needs a TTY and Node 18+.

---

## Install

Two layers: the **plugin** (fetched once from the marketplace) and the **harness** (laid into each
repo you want it in).

```
/plugin marketplace add Pierry/harness-kit
/plugin install harness-kit@harness-kit
```

Restart Claude Code, then inside the repo you want to use it in:

```
/harness-kit:install
```

`/harness-kit:install` lays the full harness into that repo, agents, commands, skills, hooks, and the
status bar, under `.claude/` plus `AGENTS.md`/`CLAUDE.md` at the root. Run it once per repo.

Requires Claude Code, `python3`, `git`, and the [gh CLI](https://cli.github.com/) (for PRs).
[Full tooling →](docs/ARCHITECTURE.md#tooling)

### Update

The plugin version is pinned, so a new release does **not** reach you until you pull it. **Three**
steps, in order, the middle one matters:

```
/plugin update harness-kit     # step 1: fetch the newer plugin into the cache
                               # step 2: RESTART Claude Code  (plugins load at startup)
/harness-kit:update            # step 3: re-lay it into THIS repo, once per repo
```

Skip the restart and step 3 would re-lay the *old* version it still has loaded (the updater detects
this and stops with a reminder). On session start the harness compares your installed version against
the latest release (best-effort, cached ~24h, never blocks) and prints a one-line notice when you're
behind. Disable with `HK_UPDATE_CHECK=0`. New users get the latest on install automatically. Current
version: see the badge and [`CHANGELOG.md`](CHANGELOG.md).

---

## The agents

All registered in [`AGENTS.md`](./AGENTS.md). Each ships its own sensors, evals, guides, and skills.

- **`product-manager`**: turns a problem into an engineering-ready spec.
  Skills `prd`, `prp`. [Docs →](.claude/agents/product-manager/README.md)
- **`staff-software-engineer`**: turns an approved PRP into a merged PR (or a satisfied spec).
  Skills `backend`, `web`, `mobile`, `devops`, auto-detected from the repo, plus `designer`
  (Material Design 3, dark/light theme, modern type, i18n, favicon) for new UIs.
  [Docs →](.claude/agents/staff-software-engineer/README.md)
- **`system-architect`**: turns a problem into a rigorous System Design Doc, then an adversarial
  review. Topic playbooks per classic design (url-shortener, rate-limiter, search-engine). Optional
  front stage before the pipeline. [Docs →](.claude/agents/system-architect/README.md) ·
  [Wiki →](https://github.com/Pierry/harness-kit/wiki)

---

## Context optimization

Optional, all local-first. As a target repo and the harness grow, the tokens spent *loading context*
and *reading command output* start to dominate. Four tools cut that, and they stack with the
per-stage model tiers:

| Tool | Cuts | How | Setup |
|---|---|---|---|
| [`/context:pack`](docs/COMMANDS.md) | input | `repomix` snapshot of the target repo, cached per feature | ships with harness |
| [`/context:graph`](docs/COMMANDS.md) | input | `graphify` knowledge graph, query "what calls X" (~71× fewer tokens) | ships with harness |
| **qmd** | input | local semantic search over the harness's guides, returns the relevant excerpt | `setup/setup-qmd.sh` |
| **rtk** | output | shell proxy that compresses `git`/`test`/`lint`/`grep` output 60-90% | `brew install rtk && rtk init -g` |

`pack` and `graph` ship with the harness and feed the plan and SDD-eval stages, falling back to grep
otherwise. qmd and rtk are third-party, install them yourself. See [issue #2](https://github.com/Pierry/harness-kit/issues/2)
for the rationale and measured wins, and [`context-strategy.md`](.claude/shared/context-strategy.md)
for the tier order.

---

## Docs

| | |
|---|---|
| [Golden path](docs/GOLDEN-PATH.md) | the full front-door walkthrough |
| [Commands & gates](docs/COMMANDS.md) | every command, every sensor and eval |
| [Architecture](docs/ARCHITECTURE.md) | stage anatomy, status bar, repo layout, tooling |
| [Quality tracking](docs/quality/README.md) | how the phase-quality dashboard is fed |
| [Conventions](.claude/agents/staff-software-engineer/guides/conventions-override.md) | per-repo overrides for the SSE agent |
| [AGENTS.md](./AGENTS.md) | agent registry and path-by-path map |

---

## Foundations

This is not invented method. harness-kit is a concrete implementation of **harness engineering**, and
the system-architect agent reasons from the established engineering canon.

**The harness model** comes from Birgitta Böckeler (Thoughtworks / martinfowler.com):

- [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html): guides (feedforward), sensors (deterministic feedback), evals (inferential feedback), humans on the loop. Every stage gate here is exactly this.
- [Maintainability sensors for coding agents](https://martinfowler.com/articles/sensors-for-coding-agents.html): the sensor idea our structure checks implement.

**The system-design canon** behind the `system-architect` agent (full mapping in
[`design-method.md`](.claude/agents/system-architect/guides/design-method.md)):

- [*Designing Data-Intensive Applications*](https://dataintensive.net/), Martin Kleppmann: reliability / scalability / maintainability as the spine.
- *A Philosophy of Software Design*, John Ousterhout: deep modules, simple interfaces, complexity is the enemy.
- *Release It!*, Michael Nygard: stability patterns: circuit breaker, bulkhead, timeout, backoff.
- Jeff Dean (numbers every engineer should know), Werner Vogels (design for failure), Pat Helland (immutability, events over mutable state), Leslie Lamport, Sam Newman, Gregor Hohpe.

**The system-design topic playbooks** adapt the [System Design series](https://github.com/Pierry/harness-kit/wiki), one wiki page per classic problem (url-shortener, rate-limiter, search-engine), with the theory, diagrams, and references for each.

---

## Contributing

Issues and PRs welcome. The harness is plain markdown, Python, and shell, agents under
`.claude/agents/`, commands under `.claude/commands/`, hooks wired in `.claude/settings.json`.
See [`AGENTS.md`](./AGENTS.md) for where everything lives.

---

MIT. Built on [Claude Code](https://claude.ai/code). Works in any repo Claude Code touches.
