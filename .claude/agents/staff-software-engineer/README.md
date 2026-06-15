# Staff Software Engineer Agent

Drives plan, dev, test, and pr stages across backend, web, mobile, and devops. Per-project conventions in each repo's `.claude/conventions/` override defaults.

Registered in [`AGENTS.md`](../../../AGENTS.md). Agent definition: [`staff-software-engineer.md`](../staff-software-engineer.md).

## Slash commands

- `/sse:plan`: generate an implementation plan from an approved PRP
- `/sse:dev`: implement the plan in code, run convention gates
- `/sse:test`: run the project test suite
- `/sse:pr`: open the draft PR
- `/sse:run`: full pipeline, plan to pr. Flags: `--local` (stop before PR), `--sdd` (hand off to spec-driven loop), `--no-monitor` (skip PR monitor only)
- `/sse:sdd`: spec-driven dev loop. Plan once, then dev↔test↔spec-satisfied eval until PRP spec met. Cap 3 iters. Local only, never auto-opens PR.

Also invokable as sub-agent via Task tool with `subagent_type: "staff-software-engineer"`.

Optional context helpers (separate namespace, manual): `/context:pack <feature_id>` and `/context:graph [repo]`. Plan stage + SDD supervisor eval consult the cache when present. See [`.claude/shared/context-strategy.md`](../../../.claude/shared/context-strategy.md).

## Tree

```
.claude/agents/staff-software-engineer/  ← definitions
├── README.md                              this file
├── skills/
│   ├── backend/SKILL.md                   Java/Spring defaults
│   ├── web/SKILL.md                       Vue/React defaults
│   ├── mobile/SKILL.md                    iOS/Android defaults
│   └── devops/SKILL.md                    CI/IaC defaults
├── guides/
│   ├── pipeline.md                        retry, approval, token accounting, variants (--local, sdd)
│   ├── sdd-loop.md                        spec-driven loop algorithm, predicate from PRP
│   ├── coding-style.md                    team code style
│   ├── commit-style.md                    Conventional Commits with TICKET
│   └── conventions-override.md            how project overrides work
├── sensors/                               plan, dev, test, pr structure + conventions + prp-has-acceptance-criteria (sdd pre-flight)
└── evals/                                 plan/dev/test/pr quality rubrics + spec-satisfied (sdd supervisor)

.claude/runtime/                          ← state + outputs
├── hooks/staff-software-engineer/         phase markers, sensor gates
├── scripts/staff-software-engineer/       symlinks to PM scripts (sensor-runner, token-phase)
├── outputs/sse/
│   ├── plan/                              generated plans
│   ├── dev/                               dev summaries
│   ├── test/                              test results
│   ├── pr/                                opened PR records
│   ├── sdd/                               sdd-loop transcripts (per-iter eval verdicts)
│   ├── tokens/                            per-feature phase tokens JSON
│   └── .markers/                          phase start/end markers (transient)
└── cache/                                 optional context tools (gitignored)
    ├── repomix/{feature_id}.xml           per-feature snapshot (ephemeral, cleared on /pipeline:reset)
    └── graphify/{slug}/graphify-out/      per-repo knowledge graph (long-lived, manual rebuild)
```

## How conventions work

The plugin holds team defaults per area. Each project repo can override by adding:

```
{repo-root}/.claude/conventions/{area}.md
```

Example for the `recon-service` repo:

```
recon-service/.claude/conventions/backend.md
```

Plugin skills read both. Project rules win. See `guides/conventions-override.md`.

## Where to edit

| Change | File |
|--------|------|
| Pipeline order | guides/pipeline.md |
| Retry count | guides/pipeline.md (Max attempts) |
| Plan template/rules | skills/backend/SKILL.md (etc per area), commands/plan.md |
| Eval threshold | evals/plan-quality.md (Threshold) |
| Code style | guides/coding-style.md |
| Commit format | guides/commit-style.md |
| Test command detection | commands/test.md |
| PR template | commands/pr.md, hooks/post-eval-pr.sh |
| Sensors | sensors/*.md |
| SDD loop algorithm | guides/sdd-loop.md |
| SDD iter cap | guides/sdd-loop.md + commands/sdd.md |
| SDD predicate rubric | evals/spec-satisfied.md |
| SDD pre-flight check | sensors/prp-has-acceptance-criteria.md |
| --local behavior | commands/run.md (## Flags) |
| Context tier order | ../../shared/context-strategy.md |

## Connects to PM plugin

`/sse:run` reads the latest approved PRP from `.claude/runtime/outputs/pm/prp/`. The feature_id flows through: PM plugin creates `2026-05-12-billing-tz-fix`, SSE plugin reuses the same id and writes its phases to the same `.claude/runtime/outputs/sse/tokens/{feature_id}.json` file (per `guides/pipeline.md`).

Full lifecycle in one JSON: PRD generate, PRD validate, PRP generate, PRP validate, plan generate, plan validate, dev, test, pr.

## Setup

Hooks registered in `.claude/settings.json` under PostToolUse. Token script reused from the PM plugin via symlinks in `scripts/`.

PR opening requires the `gh` CLI authenticated. `pr.md` command details ticket detection and template.
