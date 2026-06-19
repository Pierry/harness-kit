# AGENTS.md, Agent Registry & Routing

Source of truth for every agent, skill, and runtime path in this workspace.

This file is the **declarative spec**. Execution lives in `.claude/agents/` (definitions), `.claude/runtime/` (state, outputs), and `.claude/shared/` (cross-agent docs). Pipelines like `/sse:run` and `/product-manager:run` consult this registry when dispatching.

Portable across tools (Claude Code, Cursor, Codex CLI, Gemini CLI, and others): all read `AGENTS.md` at the repo root. See [Cross-tool compatibility](#cross-tool-compatibility) for what each tool consumes.

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
│   │   └── skills/                backend, web, mobile, devops, designer (new UIs)
│   ├── system-architect/
│   │   ├── README.md
│   │   ├── sensors/               design-structure, design-rigor
│   │   ├── evals/                 design-quality, design-review-depth
│   │   ├── guides/                design-method (the canon), templates, example
│   │   └── skills/                design, review, search-engine (+ one per system design)
│   ├── product-manager.md         orchestrator agent
│   ├── staff-software-engineer.md orchestrator agent
│   └── system-architect.md        orchestrator agent
├── commands/                      ← slash-command entry points
│   ├── golden-path.md             /golden-path  (front door: idea → merged PR)
│   ├── product-manager/           /product-manager:{prd,prp,run}
│   ├── sse/                       /sse:{plan,dev,test,pr,run,sdd,firebase-publish}
│   ├── system-design/             /system-design:{design,review,run}
│   ├── context/                   /context:{pack,graph}
│   └── pipeline/                  /pipeline:{continue,reset}
├── shared/                        ← cross-agent guides (context-strategy.md)
├── conventions/                   ← generic conventions (overridable per repo)
├── hooks/                         ← root lifecycle hooks (session-start, prompt, postedit, postwrite, status-line, activity-pre-read)
├── scripts/                       ← root utilities (pipeline.py, activity.py, pr-monitor.py, marker.sh, preflight.sh, pack-repo.sh, graph-repo.sh)
└── runtime/                       ← generated artifacts + per-agent hooks/scripts
    ├── outputs/
    │   ├── pm/{prd,prp,tokens,.markers}/
    │   └── sse/{plan,dev,test,pr,tokens,.markers}/
    ├── hooks/
    │   ├── product-manager/       phase markers, sensor gates, eval, publish
    │   └── staff-software-engineer/
    └── scripts/
        ├── product-manager/       sensor-runner, token-phase, link-validator, confluence-publish, run-sensors.sh
        └── staff-software-engineer/  token-phase, run-sensors.sh
```

---

## Agent registry

### Orchestrators

| Agent | When to use | Entry | Definition |
|---|---|---|---|
| `product-manager` | Generate PRD then PRP for a squad/feature | `/product-manager:run` | `.claude/agents/product-manager.md` |
| `staff-software-engineer` | Full engineering pipeline: plan → dev → test → pr | `/sse:run` | `.claude/agents/staff-software-engineer.md` |
| `staff-software-engineer` (sdd) | Spec-driven dev loop, local only: plan once + dev↔test↔eval until PRP spec met | `/sse:sdd` | `.claude/agents/staff-software-engineer/guides/sdd-loop.md` |
| `system-architect` | Design a system into a System Design Doc, then adversarial review. Optional front stage before PRP/plan. | `/system-design:run` | `.claude/agents/system-architect.md` |

---

## Routing

When the user types a slash command, the entry point is unambiguous. When the user describes work in natural language, the main session consults this routing table:

| User intent | Route |
|---|---|
| "go from idea to merged PR" (the golden path) | `/golden-path` (full-run: PM then SSE) |
| "design a system" / "how would you architect X at scale" | `system-architect` → `/system-design:run` |
| "design a search engine / crawler" | `/system-design:design` → routes to `skills/search-engine/` |
| "design a URL shortener / link service" | `/system-design:design` → routes to `skills/url-shortener/` |
| "design a rate limiter / throttle / quota" | `/system-design:design` → routes to `skills/rate-limiter/` |
| "review this system design" | `/system-design:review` |
| "ship a new feature end-to-end" (spec in hand) | `staff-software-engineer` (`/sse:run` full pipeline) |
| "draft a PRD" | `product-manager` → `/product-manager:prd` |
| "draft a PRP" | `product-manager` → `/product-manager:prp` |
| "full PM pipeline" | `product-manager` → `/product-manager:run` |
| "make the plan" | `/sse:plan` |
| "implement the plan" | `/sse:dev` |
| "run tests" | `/sse:test` |
| "open the PR" | `/sse:pr` |
| "dev + test locally, no PR" | `/sse:run --local` |
| "spec-driven loop until PRP met" | `/sse:sdd` |
| "deploy static site to Firebase Hosting" | `/sse:firebase-publish` |
| "snapshot a repo for AI context" | `/context:pack <feature_id>` |
| "build knowledge graph of a repo" | `/context:graph` |
| "continue the active pipeline" | `/pipeline:continue` |
| "abandon active feature" | `/pipeline:reset` |

**Rule of thumb:** if you know the agent, invoke directly. If you only know the intent, this table dispatches.

---

## Pipeline stages

Six gated stages, one feature: `prd → prp → plan → dev → test → pr`.

### Golden path

`/golden-path` is the front door, one command runs all six stages, idea → merged PR
(`full-run` shape: `/product-manager:run` then `/sse:run`). It is the **opinionated,
supported, optional, self-serviceable, transparent** way through the harness:

- **Opinionated/supported**: one pipeline; sensors + evals gate every stage.
- **Optional**: step off any time, run stages solo. No enforcement.
- **Self-serviceable**: one command, no tickets.
- **Transparent/extensible**: each stage names the sensors/evals/guides that ran; per-repo
  `conventions/{backend,web,mobile,devops}.md` override the dev stage (the per-discipline paving).

Full reference: [`docs/GOLDEN-PATH.md`](./docs/GOLDEN-PATH.md). Command:
[`.claude/commands/golden-path.md`](./.claude/commands/golden-path.md).

Each stage:
1. Writes a markdown artifact to `.claude/runtime/outputs/{pm,sse}/{stage}/{feature_id}.md`.
2. Triggers deterministic sensors (markdown rules + Python runner) on save.
3. Applies an LLM-judge eval rubric, retries on low score (up to 3).
4. On approval, records token spend per phase under `.claude/runtime/outputs/{pm,sse}/tokens/{feature_id}.json`.

Phase markers under `.claude/runtime/outputs/{pm,sse}/.markers/` track stage boundaries (`{feature}.{phase}.{start,end}`) for token accounting and pipeline status.

### SDD variant

`/sse:sdd` adds a spec-driven loop replacing the single-shot `dev → test`:

```
prd → prp → plan → [dev ↔ test ↔ spec-satisfied eval]  →  [user gate]  →  pr
                          ↑ loop, cap 3 iters             stops local
```

- Predicate built from PRP `## 3) What → Success criteria (verifiable)` + `## 6) Validation gates`.
- Pre-flight sensor `prp-has-acceptance-criteria` blocks if PRP not testable.
- Per-iter supervisor eval `spec-satisfied` runs in fresh session (no worker context).
- Transcript at `.claude/runtime/outputs/sse/sdd/{feature_id}.md`.
- PR never auto-opened. User triggers `/sse:pr` after reviewing transcript.

---

## Runtime (state, outputs, hooks)

Generated artifacts and lifecycle hooks live under `.claude/runtime/`.

| Path | Contents |
|---|---|
| `runtime/outputs/pm/{prd,prp,tokens,.markers}/` | PRD/PRP artifacts, token JSONs, phase markers |
| `runtime/outputs/sse/{plan,dev,test,pr,sdd,tokens,.markers}/` | Plan/dev/test/pr/sdd-loop artifacts, token JSONs, phase markers |
| `runtime/outputs/architect/{design,review}/` | System Design Docs and design reviews |
| `runtime/cache/{repomix,graphify}/` | Optional context cache: repomix snapshots (per feature_id) + graphify graphs (per repo). See `.claude/shared/context-strategy.md` |
| `runtime/hooks/<agent>/` | Per-agent lifecycle hooks (post-write, post-eval, pre-prp-check) |
| `runtime/scripts/<agent>/` | Per-agent utilities (sensor-runner, token-phase, link-validator, confluence-publish, run-sensors.sh) |

`settings.json` `hooks` blocks reference these paths. `.claude/scripts/pipeline.py` reads/writes markers and outputs.

### Committed scripts vs inline shell

Slash commands invoke named, committed scripts instead of improvising shell, so each permission prompt shows a readable path, not an opaque `date`/`printf`/`grep` one-liner:

| Script | Replaces | Used by |
|---|---|---|
| `.claude/scripts/marker.sh start\|approve` | inline `date` / `printf >>` marker writes | every pm/sse stage |
| `.claude/scripts/preflight.sh <bins>` | inline `node -v` / `npm ping` / `$(...)` probes | `/sse:dev` |
| `.claude/runtime/scripts/<agent>/run-sensors.sh` | inline `grep` / `for` sensor loops | pm + sse stages |

The installer pre-authorizes these in `settings.json` `permissions.allow` (both bare-path and `bash <path>` forms), so a full pipeline run never stops for a harness-internal prompt. Destructive ops (`rm -rf`, force push, hard reset) stay in `permissions.deny` and still prompt.

---

## Distribution

This repo is **harness-kit**, the source-of-truth template. Three install paths, all landing the same `.claude/` tree:

| Path | Command | Notes |
|---|---|---|
| Claude Code marketplace | `/plugin marketplace add Pierry/harness-kit` → `/plugin install harness-kit@harness-kit` → `/harness-kit:install` | Plugin is a **bootstrap**: it ships the full harness and the `/harness-kit:install` skill runs `setup/install.sh` into the project. See `.claude-plugin/`. |
| npm | `npx @pieerry/harness-kit` (or `hk install`) | `bin/hk.js` wraps `setup/install.sh`. |
| git clone | `git clone … && bash setup/install.sh <target>` | Direct. |

`setup/install.sh` copies:

- `AGENTS.md` and `CLAUDE.md` to the target root
- `.claude/agents/`, `.claude/commands/`, `.claude/hooks/`, `.claude/scripts/`, `.claude/conventions/` to the target `.claude/`
- `.claude/runtime/hooks/`, `.claude/runtime/scripts/` to the target (definition-side only; `outputs/`, `state/`, `.markers/` are runtime, not distributed)
- `.claude/settings.json` `hooks` block, merged with the consumer's existing settings

`setup/update.sh` migrates v3.x consumers (which have `.claude/plugins/`) to v4.x layout in place. v3.x consumers were the **plugin-shaped** distribution.

---

## Cross-tool compatibility

The harness targets Claude Code, but its assets are layered so other AI coding tools degrade gracefully rather than breaking.

| Tool | Reads | Gets | Does NOT get |
|---|---|---|---|
| **Claude Code** | everything | agents, slash commands, skills, hooks, status bar, sensors/evals |, (full feature set) |
| **Codex CLI** | `AGENTS.md` (+ nested) | the agent registry, routing table, pipeline spec as standing instructions | slash commands, hooks, status bar (Claude-Code-specific) |
| **Gemini CLI** | `AGENTS.md`; optional Gemini *extensions* | same standing instructions; can wrap commands as extensions | Claude Code hooks/slash commands |
| **Cursor / Windsurf / others** | `AGENTS.md` | registry + routing as project rules | hooks, slash commands |

**What's portable vs Claude-Code-only:**

- **Portable** (plain markdown, any tool reads): `AGENTS.md`, `CLAUDE.md`, every `guides/`, `sensors/`, `evals/`, and `skills/SKILL.md` body. These are instructions, not executables.
- **Claude-Code-only**: `.claude/commands/*` (slash commands), `.claude/hooks/*` + `.claude/settings.json` `hooks` (lifecycle automation, status bar), the `Skill`/`Task` tool dispatch. Other tools ignore these silently.

**Guidance for non-Claude tools:** point the tool at `AGENTS.md` as the entry rule. The registry + routing + pipeline-stages sections are written to be executed by any capable agent reading them as instructions, it follows the same `prd → prp → plan → dev → test → pr` flow manually, reading the same `guides/` and writing the same artifacts, just without the slash-command shortcuts and gate automation.

There is no central registry that indexes one tool into all ecosystems. `AGENTS.md` is the de-facto cross-tool standard and is read directly from the repo on clone, no submission step exists or is needed.

---

## Adding a new agent

1. Create `.claude/agents/<name>.md` (or `.claude/agents/<name>/agent.md` if bundled assets).
2. Register here under the right section.
3. If invocable via slash command, add `.claude/commands/<name>.md`.
4. If it needs lifecycle hooks, add under `.claude/runtime/hooks/<name>/` and wire in `.claude/settings.json`.

---

## See also

- [`CLAUDE.md`](./CLAUDE.md): workspace context, style, role
- [`.claude/commands/`](./.claude/commands/): slash command definitions
- [`setup/install.sh`](./setup/install.sh): consumer installer
- [`setup/update.sh`](./setup/update.sh): v3→v4 migration tool
