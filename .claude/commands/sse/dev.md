---
description: Implement the approved plan in code. Writes commits, runs gates, returns diff summary.
---

Implement plan. Follow .claude/agents/staff-software-engineer/guides/pipeline.md.

Print header card before coding and footer card after gates run. Format: .claude/scripts/stage-card.md.

Source plan: latest in .claude/runtime/outputs/sse/plan/ with approved marker. None, abort. Ask user to run /sse:plan first.

Before coding, write the phase start marker by running this script. Do NOT inline `date`/`printf`:

```
.claude/scripts/marker.sh start .claude/runtime/outputs/sse/.markers/{feature_id}.dev-generate.start
```

Probe the toolchain with the committed script (do NOT inline `node -v`/`npm ping`/`$(...)` env checks):

```
.claude/scripts/preflight.sh node npm git
```

Read:
- source plan
- area skill: .claude/agents/staff-software-engineer/skills/{area}/SKILL.md
- designer skill: .claude/agents/staff-software-engineer/skills/designer/SKILL.md (when building a new UI: new app, page, feature, or landing). Apply M3 tokens, dark/light theme, modern font, i18n en/pt-BR/es, context-aware favicon.
- .claude/agents/staff-software-engineer/guides/coding-style.md
- .claude/agents/staff-software-engineer/guides/commit-style.md
- project conventions: {repo}/.claude/conventions/{area}.md if present

Read 3+ similar files in target repo before writing. Match conventions:
- framework version (Spring 4.3 no-Boot vs Spring Boot, Vue 2 vs 3)
- build tool (Maven, Gradle, npm)
- package layout, test framework, helpers

Designer-skill gate (ask once, before any code). Plan includes new or changed UI (app, page, feature, landing, component, any visual surface)? ASK user once via AskUserQuestion:
- Q: "This work has UI. Apply the designer skill (Material Design 3, dark/light theme, modern font, modern icons, Behance-grade polish, context-aware favicon, i18n, animations)?"
- options: "Yes, apply designer defaults (Recommended)" | "No, match existing / minimal styling"
- Repo already has a design system → default the question toward matching it, not imposing M3. Greenfield UI → default Yes.
Honor answer. Yes → read + apply designer SKILL.md fully. No → skip M3 defaults, still respect no-emoji and no-em-dash hard rules. Pure backend/devops/no-UI work → skip the question entirely, do not ask.

Write code in small commits (1-4 files, < 100 lines ideal). Conventional Commits format.

Code gates (run after each implementation step):
- .claude/agents/staff-software-engineer/sensors/code-conventions.md (lint, formatting, banned patterns)
- .claude/agents/staff-software-engineer/sensors/test-coverage.md (every feature/bugfix has tests)

Any gate fails, fix and retry. Max 3 attempts. Hard stop after 3.

After done, write `.claude/runtime/outputs/sse/dev/{feature_id}.md` with summary:
- files changed
- commits
- gate results
- blockers if any

Document gates (run on saved summary):
- Sensor: .claude/agents/staff-software-engineer/sensors/dev-structure.md (auto-run by post-write hook)
- Eval:   .claude/agents/staff-software-engineer/evals/dev-quality.md (you score it; threshold 8.0)

Run the deterministic dev-structure sensor on the saved summary via the committed runner (do NOT improvise inline grep/for loops). Read the code-conventions / test-coverage / eval specs with the Read tool, never `cat` them in a loop:

```
.claude/runtime/scripts/staff-software-engineer/run-sensors.sh .claude/runtime/outputs/sse/dev/{feature_id}.md .claude/agents/staff-software-engineer/sensors/dev-structure.md
```

Append approval marker only when code gates pass and dev-quality eval is >= 8.0. Use the committed script (do NOT inline `printf >>`); it appends `<!-- approved: {YYYY-MM-DD} -->`:

```
.claude/scripts/marker.sh approve .claude/runtime/outputs/sse/dev/{feature_id}.md {score}
```

After approval, reply with this exact shape (name actual sensors/evals/guides that ran):

```
Dev complete. branch {branch}.
  files changed: {N}
  commits: {M} ({short-sha}, {short-sha}, ...)
  sensors: code-conventions ok, test-coverage ok, dev-structure ok
  eval:    dev-quality {N}/10
  design:  {applied designer skill | skipped, matched existing | n/a, no UI}
  guides:  coding-style.md, commit-style.md, skills/{area}/SKILL.md
  refs:    plan/{feature_id}.md, conventions/{area}.md
  next:    /sse:test
```
