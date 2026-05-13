---
description: Implement the approved plan in code. Writes commits, runs gates, returns diff summary.
---

Implement the plan. Follow .claude/plugins/staff-software-engineer/guides/pipeline.md.

Print a header card before coding and a footer card after gates run. Format: .claude/scripts/stage-card.md.

Source plan: latest in .claude/plugins/staff-software-engineer/outputs/plan/ with approved marker. If none, abort and ask user to run /sse:plan first.

Before coding, write the phase start marker:

```
.claude/plugins/staff-software-engineer/outputs/.markers/{feature_id}.dev.start
```

Read:
- the source plan
- the area skill: .claude/plugins/staff-software-engineer/skills/{area}/SKILL.md
- .claude/plugins/staff-software-engineer/guides/coding-style.md
- .claude/plugins/staff-software-engineer/guides/commit-style.md
- project conventions: {repo}/.claude/conventions/{area}.md if present

Read 3+ similar files in the target repo before writing. Match conventions:
- framework version (Spring 4.3 no-Boot vs Spring Boot, Vue 2 vs 3)
- build tool (Maven, Gradle, npm)
- package layout, test framework, helpers

Write code in small commits (1-4 files, < 100 lines ideal). Conventional Commits format.

Gates (run after each implementation step):
- .claude/plugins/staff-software-engineer/sensors/code-conventions.md (lint, formatting, banned patterns)
- .claude/plugins/staff-software-engineer/sensors/test-coverage.md (every feature/bugfix has tests)

If any gate fails, fix and retry. Max 3 attempts. Hard stop after 3.

After done, write `.claude/plugins/staff-software-engineer/outputs/dev/{feature_id}.md` with summary:
- files changed
- commits
- gate results
- blockers if any

Append approval marker when all gates pass:

```
<!-- approved: {YYYY-MM-DD} -->
```

Reply: Dev complete. {N} files changed, {M} commits. Next /sse:test.
