---
description: Implement the approved plan in code. Writes commits, runs gates, returns diff summary.
---

Implement plan. Follow .claude/agents/staff-software-engineer/guides/pipeline.md.

Print header card before coding and footer card after gates run. Format: .claude/scripts/stage-card.md.

Source plan: latest in .claude/runtime/outputs/sse/plan/ with approved marker. None, abort. Ask user to run /sse:plan first.

Before coding, write phase start marker:

```
.claude/runtime/outputs/sse/.markers/{feature_id}.dev-generate.start
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

Append approval marker only when code gates pass and dev-quality eval is >= 8.0:

```
<!-- approved: {YYYY-MM-DD} -->
```

After approval, reply with this exact shape (name actual sensors/evals/guides that ran):

```
Dev complete. branch {branch}.
  files changed: {N}
  commits: {M} ({short-sha}, {short-sha}, ...)
  sensors: code-conventions ok, test-coverage ok, dev-structure ok
  eval:    dev-quality {N}/10
  guides:  coding-style.md, commit-style.md, skills/{area}/SKILL.md
  refs:    plan/{feature_id}.md, conventions/{area}.md
  next:    /sse:test
```
