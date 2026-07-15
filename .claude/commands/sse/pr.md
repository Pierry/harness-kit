---
description: Open a Pull Request on GitHub following team conventions. Draft by default.
---

Open Pull Request. Follow .claude/agents/staff-software-engineer/guides/pipeline.md for retry, approval, publish, and .claude/shared/pipeline-pattern.md for inputs (resolve-mark-proceed) and eval (adversarial).

Print header card before opening and footer card after gh returns. Format: .claude/scripts/stage-card.md.

Prerequisites:
- All previous gates passed (plan approved, dev approved, test approved).
- Branch pushed to origin with current changes.

Before opening, write the phase start marker by running this script. Do NOT inline `date`/`printf` (command-substitution + redirect always trips the permission prompt):

```
.claude/scripts/marker.sh start .claude/runtime/outputs/sse/.markers/{feature_id}.pr-generate.start
```

Read:
- .claude/agents/staff-software-engineer/guides/commit-style.md
- latest plan and dev outputs (for body content)

Infer the ticket id from the branch name (e.g., `feat/PROJ-123-foo` -> `PROJ-123`), else from the PRP/plan/intake frontmatter or commit messages. If none yields one, mark `NOT FOUND - NEEDS REVIEW: ticket id` in the record and open the PR without it. Do NOT ask the user. Never call Jira API.

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
- Eval:   .claude/agents/staff-software-engineer/evals/pr-quality.md (threshold 8.0)

Run the evals **adversarially**: dispatch a fresh evaluator via the Task tool (`subagent_type: general-purpose`) that did not author this PR record. Hand it only the artifact path and the one rubric path; it scores against the rubrics and reports weighted totals plus the low-scoring dimensions. Below threshold (8.0) retries per pipeline.md, regenerating only the flagged dimensions.

Append approval marker only when sensor passes and pr-quality eval is >= 8.0. Append with the **Edit tool**, not Bash: post-eval-sse.sh fires on Edit, and a Bash append skips token accounting and the score log. Keep `score=` in the shape, phase-log.py only parses markers that carry it:

```
<!-- approved: {YYYY-MM-DD} score={N} ready-for-handoff: true -->
```

Reply with this exact shape:

```
PR opened: {url}
  title:   {title}
  draft:   {yes|no}
  sensors: pr-structure ok
  eval:    pr-quality {N}/10
  guides:  commit-style.md
  refs:    plan/{feature_id}.md, dev/{feature_id}.md
  next:    request review (if draft, mark ready when checks pass)
```

After replying, **auto-invoke `/sse:pr-monitor`** so session watches PR for merge with backoff polling. Skip if user passed `--no-monitor` or PR already MERGED.
