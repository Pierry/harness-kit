# System Architect Agent

Turns a system/problem into a rigorous System Design Doc, then runs an adversarial staff-level
review. Method comes from the System Design series (EP24 worked example) and the engineering canon
(Kleppmann/DDIA, Jeff Dean, Vogels, Helland, Nygard, Ousterhout). Built as a harness in the sense of
Böckeler/Fowler, "Harness engineering for coding agent users": guides (feedforward) + sensors +
evals (feedback), humans on the loop.

Registered in [`AGENTS.md`](../../../AGENTS.md). Agent definition: [`system-architect.md`](../system-architect.md).

## Slash commands

- `/system-design:design`: produce a System Design Doc. Routes to a topic playbook or the generic skill.
- `/system-design:review`: adversarial review of a design doc, returns a verdict.
- `/system-design:run`: full pipeline, design then review.

Also invokable as sub-agent via Task tool with `subagent_type: "system-architect"`.

## Skills are per-system-design

Like the SSE agent picks an area skill (backend/web/mobile/devops), this agent picks a **topic
skill**: one per classic system design problem. Each episode of the series becomes a skill: a canned
reference architecture the agent adapts to the user's real scale.

This table is the lean index: what each skill is for. The **full theory, diagrams, and references live
in the [wiki](https://github.com/Pierry/harness-kit/wiki)**: one detailed page per design.

| Skill | What it is for | Deep dive |
|---|---|---|
| `skills/design/` | generic fallback, any system with no topic playbook | [Method](https://github.com/Pierry/harness-kit/wiki/System-Design-Method) |
| `skills/review/` | adversarial staff-level review of an existing design | [Method](https://github.com/Pierry/harness-kit/wiki/System-Design-Method) |
| `skills/url-shortener/` | link shortener, redirect service, read-heavy key lookup (#1) | [wiki](https://github.com/Pierry/harness-kit/wiki/URL-Shortener) |
| `skills/rate-limiter/` | rate limit, throttle, quota, abuse/cost guard (#2) | [wiki](https://github.com/Pierry/harness-kit/wiki/Rate-Limiter) |
| `skills/search-engine/` | web search, crawler, indexing, ranking at scale (#3) | [wiki](https://github.com/Pierry/harness-kit/wiki/Search-Engine) |

Add the next episode as `skills/{topic}/SKILL.md` (e.g. news-feed, chat, job-scheduler, api-gateway,
distributed-queue, analytics-pipeline): write the skill, add a wiki page with the theory and
references, and register it in the design command's route list and this table. Nothing else changes.

## Tree

```
.claude/agents/system-architect/      ← definitions
├── README.md                          this file
├── skills/
│   ├── design/SKILL.md                generic system design
│   ├── review/SKILL.md                adversarial review
│   ├── url-shortener/SKILL.md         topic playbook (#1)
│   ├── rate-limiter/SKILL.md          topic playbook (#2)
│   └── search-engine/SKILL.md         topic playbook (#3)
├── guides/
│   ├── design-method.md               the method + the canon (read first)
│   ├── pipeline.md                    retry, approval, output paths
│   ├── writing-style.md               voice, banned words
│   ├── templates/{system-design,design-review}.md
│   └── examples/good-system-design-example.md
├── sensors/
│   ├── design-structure.md            required sections, mermaid, no unfilled tokens
│   └── design-rigor.md                numbers, sizing math, trade-offs, phases
└── evals/
    ├── design-quality.md              LLM-judge, threshold 8.0
    └── design-review-depth.md         LLM-judge for the review

.claude/runtime/outputs/architect/   ← outputs (created on demand)
├── design/                            generated SDDs
└── review/                            generated reviews
```

## Where to edit

| Change | File |
|--------|------|
| The method / canon | guides/design-method.md |
| Retry count, output paths | guides/pipeline.md |
| Artifact shape | guides/templates/system-design.md |
| Review shape | guides/templates/design-review.md |
| Voice and banned words | guides/writing-style.md |
| Deterministic checks | sensors/design-structure.md, sensors/design-rigor.md |
| Rubric dimensions | evals/design-quality.md, evals/design-review-depth.md |
| Add a new system design | skills/{topic}/SKILL.md + route list in commands/system-design/design.md |

## How it runs

1. User invokes a slash command.
2. Skill routes to a topic playbook or the generic design skill.
3. Claude reads design-method.md + template, generates the SDD, saves to outputs/architect/design/.
4. Sensors (design-structure, design-rigor) self-apply as a hard gate. Missing section, missing
   number, no mermaid, or an unfilled template token blocks.
5. Eval design-quality scores 0-10. Retry up to 3 if below 8.0, regenerating low-scoring sections.
6. On pass, append the approval marker.
7. Review skill interrogates the design (10 staff questions), returns ship/revise/block.

No settings.json hooks required, sensors and evals are self-applied markdown rules, portable to any
tool that reads `AGENTS.md`. Token-accounting hooks can be added later mirroring the PM agent if wanted.

## Where it sits in the harness

System design is an optional front stage before PRP/plan. A strong SDD feeds a sharper PRP
(`/product-manager:prp`) and a grounded plan (`/sse:plan`). Not in the golden path by default; run it
when the engineering shape is non-trivial.
