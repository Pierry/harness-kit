---
description: Generate an implementation plan from an approved PRP. Sensors and evals gate.
---

Generate a technical plan. Follow .claude/plugins/staff-software-engineer/guides/pipeline.md for retry, approval, and publish.

Print a header card before drafting and a footer card after gates run. Format: .claude/scripts/stage-card.md.

Source PRP: if user passes a path, use it. Else pick the most recent in .claude/plugins/product-manager/outputs/prp/. None found, abort. Tell user to run /product-manager:prp first.

Compute feature_id from the source PRP filename (basename without .md). Save the plan to .claude/plugins/staff-software-engineer/outputs/plan/{feature_id}.md so it matches.

Before generating, write the phase start marker:

```
.claude/plugins/staff-software-engineer/outputs/.markers/{feature_id}.plan-generate.start
```

Content: `{"timestamp": "<ISO-8601 UTC now>", "session_id": ""}`

Read:
- the source PRP
- .claude/plugins/staff-software-engineer/guides/pipeline.md
- .claude/plugins/staff-software-engineer/guides/coding-style.md
- .claude/plugins/staff-software-engineer/guides/examples/good-plan-example.md
- the area-specific skill: .claude/plugins/staff-software-engineer/skills/{area}/SKILL.md (where area = backend, web, mobile, devops)
- project conventions if present: {repo}/.claude/conventions/{area}.md (see .claude/plugins/staff-software-engineer/guides/conventions-override.md)

Save to .claude/plugins/staff-software-engineer/outputs/plan/{feature_id}.md.

Sensors: .claude/plugins/staff-software-engineer/sensors/plan-structure.md.

Evals: .claude/plugins/staff-software-engineer/evals/plan-quality.md.

After save, reply with this exact shape (name the actual sensors/evals/guides that ran):

```
Plan saved at {path}.
  sensors: plan-structure ok ({sub-checks: problem, files, gates, scope})
  eval:    plan-quality {N}/10
  guides:  pipeline.md, coding-style.md, skills/{area}/SKILL.md
  refs:    prp/{feature_id}.md, conventions/{area}.md
  next:    /sse:dev
```
