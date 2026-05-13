---
description: Open a Pull Request on GitHub following team conventions. Draft by default.
---

Open a Pull Request.

Prerequisites:
- All previous gates passed (plan approved, dev approved, test approved).
- Branch pushed to origin with current changes.

Before opening, write the phase start marker:

```
.claude/plugins/staff-software-engineer/outputs/.markers/{feature_id}.pr.start
```

Read:
- .claude/plugins/staff-software-engineer/guides/pr-template.md
- .claude/plugins/staff-software-engineer/guides/commit-style.md
- the latest plan and dev outputs (for the body content)

Detect ticket id from branch name (e.g., `feat/PROJ-123-foo` -> `PROJ-123`). If branch has none, ask the user once. Never call Jira API.

Compose:
- Title: conventional commit prefix + short description (e.g., `feat(PROJ-123): add timezone-aware deadline check`)
- Body: links to PRD/PRP, summary, test plan checklist
- Draft: yes by default unless user passes `--ready`

Open via `gh pr create --draft --title "..." --body "..."`.

Save .claude/plugins/staff-software-engineer/outputs/pr/{feature_id}.md with:
- pr url
- title
- draft status
- summary

Append approval marker:

```
<!-- approved: {YYYY-MM-DD} ready-for-handoff: true -->
```

Reply: PR opened: {url}.
