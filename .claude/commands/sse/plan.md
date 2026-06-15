---
description: Generate an implementation plan from an approved PRP. Sensors and evals gate.
---

Generate technical plan. Follow .claude/agents/staff-software-engineer/guides/pipeline.md for retry, approval, publish.

Print header card before drafting and footer card after gates run. Format: .claude/scripts/stage-card.md.

Source PRP: user passes path, use it. Else pick most recent in .claude/runtime/outputs/pm/prp/. None found, abort. Tell user to run /product-manager:prp first.

Compute feature_id from source PRP filename (basename without .md). Save plan to .claude/runtime/outputs/sse/plan/{feature_id}.md so it matches.

Before generating, write phase start marker:

```
.claude/runtime/outputs/sse/.markers/{feature_id}.plan-generate.start
```

Content: `{"timestamp": "<ISO-8601 UTC now>", "session_id": ""}`

Read:
- source PRP
- .claude/agents/staff-software-engineer/guides/pipeline.md
- .claude/agents/staff-software-engineer/guides/coding-style.md
- area-specific skill: .claude/agents/staff-software-engineer/skills/{area}/SKILL.md (area = backend, web, mobile, devops)
- project conventions if present: {repo}/.claude/conventions/{area}.md (see .claude/agents/staff-software-engineer/guides/conventions-override.md)
- .claude/shared/context-strategy.md, pick the right tier for target-repo lookups

Context lookups (per `context-strategy.md`):
- Cached graph at `.claude/runtime/cache/graphify/{slug}/graphify-out/graph.json` → query for callers/refs instead of grepping
- Cached pack at `.claude/runtime/cache/repomix/{feature_id}.xml` → read for full file snapshot
- Neither present → fall back to grep + Read on live repo
- Don't double-load. If pack/graph covers a PRP-listed file, skip the grep for it.

Save to .claude/runtime/outputs/sse/plan/{feature_id}.md.

Sensors: .claude/agents/staff-software-engineer/sensors/plan-structure.md.

Evals: .claude/agents/staff-software-engineer/evals/plan-quality.md.

After save, reply with this exact shape (name actual sensors/evals/guides that ran):

```
Plan saved at {path}.
  sensors: plan-structure ok ({sub-checks: problem, files, gates, scope})
  eval:    plan-quality {N}/10
  guides:  pipeline.md, coding-style.md, skills/{area}/SKILL.md
  refs:    prp/{feature_id}.md, conventions/{area}.md
  next:    /sse:dev
```
