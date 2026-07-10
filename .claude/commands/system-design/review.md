---
description: Adversarial staff-level review of a System Design Doc. Interrogates the 10 staff questions, finds cost and failure risks, returns a verdict. Sensors and evals gate.
---

Review a System Design Doc. Follow .claude/agents/system-architect/guides/pipeline.md, and .claude/shared/pipeline-pattern.md for inputs (resolve-mark-proceed) and eval (adversarial).

Resolve the design-doc path, do not ask (resolve-mark-proceed): use the path the user passes; if none
is given, default to the latest under `.claude/runtime/outputs/architect/design/`. Reviews own or
external designs. Never stop to ask for it.

Read:
- the target design doc
- .claude/agents/system-architect/guides/design-method.md
- .claude/agents/system-architect/guides/writing-style.md
- .claude/agents/system-architect/guides/templates/design-review.md
- .claude/agents/system-architect/guides/pipeline.md

Interrogate, do not summarize. Use the skill .claude/agents/system-architect/skills/review/SKILL.md.
Default skeptical. Verdict: ship | revise | block.

Save to .claude/runtime/outputs/architect/review/{feature_id}.md (reuse design feature_id).

Sensors: .claude/agents/system-architect/sensors/design-structure.md (review variant).
Evals: .claude/agents/system-architect/evals/design-review-depth.md.

Run the evals **adversarially**: dispatch a fresh evaluator via the Task tool (`subagent_type: general-purpose`) that did not author this review. Hand it only the artifact path and the one rubric path; it scores against the rubric and reports the weighted total plus the low-scoring dimensions. Below threshold (8.0) retries per pipeline.md, regenerating only the flagged dimensions.

After save, reply with this exact shape:

```
Review saved at {path}. Verdict: {ship|revise|block}. Score: {N}/10.
  sensors: design-structure ok (10 questions, verdict present)
  eval:    design-review-depth {N}/10 (attempts: N)
  refs:    design/{feature_id}.md
  blockers: {list or none}
  next:    revise the design, or proceed to /product-manager:prp or /sse:plan
```
