<div align="center">

# harness-kit

**Idea to merged PR, through one gated pipeline.**


Claude Code agents, a product manager, a staff engineer, and a system architect, that carry a raw
idea through `prd → prp → plan → dev → test → pr`, with a pass/fail check and a scored review at every stage.

[![Version](https://img.shields.io/badge/version-4.3.0-blue.svg)](VERSION)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-8b5cf6.svg)](https://claude.ai/code)
[![Stars](https://img.shields.io/github/stars/Pierry/harness-kit?style=flat&color=f5c518)](https://github.com/Pierry/harness-kit/stargazers)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE)

<br/>

![harness-kit demo](demo/preview.gif)

<sub>70s walkthrough, what it is, install, the golden path, idea to merged PR.</sub>

</div>

---

## Why

Shipping a feature on vibes skips the parts that make it correct: framing the problem, writing
acceptance criteria, holding the conventions, gating the review. harness-kit puts those back,
without you hand-writing a single doc.

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

Every stage produces a markdown artifact, gated by a deterministic **sensor** (pass/fail) and a
scored **eval** (≥ 8.0). Nothing advances on vibes. After the PR opens, an in-session monitor
watches for merge and clears state on its own.

---

## Install

```
/plugin marketplace add Pierry/harness-kit
/plugin install harness-kit@harness-kit
Restart your Claude Code and then:
/harness-kit:install
```

Restart Claude Code. The plugin lays the full harness into your repo, agents, commands, skills,
hooks, status bar. Update later with `/plugin update harness-kit` then `/harness-kit:update`.

Requires Claude Code, `python3`, `git`, and the [gh CLI](https://cli.github.com/) (for PRs).
[Full tooling →](docs/ARCHITECTURE.md#tooling)

---

## Quickstart, the golden path

One command, idea to merged PR.

**1. Write the brief.** Open the **[idea-brief builder](https://pierry.github.io/harness-kit/brief/)**
and fill the fields, squad, problem, hypothesis, customers, metric. Inline validation holds you to
the PRD conventions as you type.

**2. Paste it.** Hit **Copy brief** and paste the ready-made `/golden-path` kick into Claude Code:

```
/golden-path

Squad: checkout
Problem: Returning guests abandon checkout when a card is declined once …
Hypothesis: If we add one-tap retry, then completion rises 5 points, because …
Success metric: checkout completion, from 71% to 76% within 30 days
```

**3. Approve and ship.** All six gated stages run, PM (`prd → prp`) then Eng (`plan → dev → test → pr`).
Approve each artifact when prompted; the status bar tracks where you are. SSE flags pass straight
through: `/golden-path --local`, `--sdd`, `--no-monitor`.

Already know the idea cold? Skip the builder and type `/golden-path` with the brief yourself.
[Golden path reference →](docs/GOLDEN-PATH.md)

---

## Other ways to run

Every flow shares the same pipeline state, so you can switch between them mid-feature.

| You want | Run | Stages |
|---|---|---|
| Spec only, align before any code | `/product-manager:run` | `prd → prp` |
| Small change, plan in your head | `/sse:run` | `plan → dev → test → pr` |
| Local only, no PR | `/sse:run --local` | `plan → dev → test` |
| Loop until the spec passes | `/sse:sdd` | `plan → [dev↔test↔eval] ×3` |
| Resume after a break | `/pipeline:continue` | next pending stage |

`/sse:sdd` treats the PRP as the spec: an independent supervisor session re-checks the repo against
the PRP's `Success criteria` + `Validation gates` after every dev↔test iteration, and never opens a
PR on its own. Each stage is also its own command, `/sse:plan`, `/sse:dev`, `/sse:test`, `/sse:pr`.

**[Every command and every gate →](docs/COMMANDS.md)**

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

## Docs

| | |
|---|---|
| [Golden path](docs/GOLDEN-PATH.md) | the full front-door walkthrough |
| [Commands & gates](docs/COMMANDS.md) | every command, every sensor and eval |
| [Architecture](docs/ARCHITECTURE.md) | stage anatomy, status bar, repo layout, tooling |
| [Conventions](.claude/agents/staff-software-engineer/guides/conventions-override.md) | per-repo overrides for the SSE agent |
| [AGENTS.md](./AGENTS.md) | agent registry and path-by-path map |

---

## Contributing

Issues and PRs welcome. The harness is plain markdown, Python, and shell, agents under
`.claude/agents/`, commands under `.claude/commands/`, hooks wired in `.claude/settings.json`.
See [`AGENTS.md`](./AGENTS.md) for where everything lives.

---

MIT. Built on [Claude Code](https://claude.ai/code). Works in any repo Claude Code touches.
