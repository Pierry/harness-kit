---
description: Open a Pull Request on GitHub following team conventions. Draft by default.
---

Open Pull Request.

Print header card before opening and footer card after gh returns. Format: .claude/scripts/stage-card.md.

Prerequisites:
- All previous gates passed (plan approved, dev approved, test approved).
- Branch pushed to origin with current changes.

Before opening, write phase start marker:

```
.claude/runtime/outputs/sse/.markers/{feature_id}.pr-generate.start
```

Read:
- .claude/agents/staff-software-engineer/guides/pr-template.md
- .claude/agents/staff-software-engineer/guides/commit-style.md
- latest plan and dev outputs (for body content)

Detect ticket id from branch name (e.g., `feat/PROJ-123-foo` -> `PROJ-123`). Branch has none, ask user once. Never call Jira API.

Compose:
- Title: conventional commit prefix + short description (e.g., `feat(PROJ-123): add timezone-aware deadline check`)
- Body: links to PRD/PRP, summary, test plan checklist
- Draft: yes by default unless user passes `--ready`

Open via `gh pr create --draft --title "..." --body "..."`.

Save .claude/runtime/outputs/sse/pr/{feature_id}.md with:
- pr url
- title
- draft status
- summary
- test plan checklist
- refs (plan + dev paths)

Document gates (run on saved record):
- Sensor: .claude/agents/staff-software-engineer/sensors/pr-structure.md (auto-run by post-write hook)
- Eval:   .claude/agents/staff-software-engineer/evals/pr-quality.md (you score it; threshold 8.0)

Append approval marker only when sensor passes and pr-quality eval is >= 8.0:

```
<!-- approved: {YYYY-MM-DD} ready-for-handoff: true -->
```

Reply with this exact shape:

```
PR opened: {url}
  title:   {title}
  draft:   {yes|no}
  sensors: pr-structure ok
  eval:    pr-quality {N}/10
  guides:  pr-template.md, commit-style.md
  refs:    plan/{feature_id}.md, dev/{feature_id}.md
  next:    request review (if draft, mark ready when checks pass)
```

After replying, **auto-invoke `/sse:pr-monitor`** so session watches PR for merge with backoff polling. Skip if user passed `--no-monitor` or PR already MERGED.
