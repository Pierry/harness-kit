---
description: Run the full system design pipeline. Design then adversarial review, with sensor and eval gates between each.
---

Full system design pipeline: design then review. Follow
.claude/agents/system-architect/guides/pipeline.md.

Ask once if missing: system in 1-2 sentences, scale target, internal vs web-scale, constraints.

## Steps

1. Invoke `/system-design:design`. Route to a topic skill (search-engine) or generic. Wait for the
   approval marker on the design.
2. On approval, invoke `/system-design:review` against that design. Wait for verdict.
3. Return the combined summary.

Reuse the same feature_id across both halves.

## Where it sits in the harness

System design is an optional **front stage before PRP/plan**. A good SDD feeds a sharper PRP
(`/product-manager:prp`) and a grounded technical plan (`/sse:plan`). It is not part of the golden
path by default; run it when the engineering shape is non-trivial and worth designing before
speccing.

## Return format

Name every skill, sensor, eval, guide that ran. Concatenate the design and review blocks:

```
System design complete.

Design: .claude/runtime/outputs/architect/design/{path}. Score {N}/10.
  skill:   {search-engine | design (generic)}
  sensors: design-structure ok, design-rigor ok
  eval:    design-quality {N}/10 (attempts: N)
  guides:  design-method.md, writing-style.md, templates/system-design.md
  canon:   {names applied}

Review: .claude/runtime/outputs/architect/review/{path}. Verdict {ship|revise|block}. Score {N}/10.
  sensors: design-structure ok (10 questions, verdict present)
  eval:    design-review-depth {N}/10 (attempts: N)
  blockers: {list or none}

next: {revise design | /product-manager:prp | /sse:plan}
```

Verdict = block -> surface blockers, do not recommend proceeding.
