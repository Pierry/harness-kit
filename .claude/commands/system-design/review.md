---
description: Adversarial staff-level review of a System Design Doc. Interrogates the 10 staff questions, finds cost and failure risks, returns a verdict. Sensors and evals gate.
---

Review a System Design Doc. Follow .claude/agents/system-architect/guides/pipeline.md.

Ask once if missing: path to the design doc (default: latest under
`.claude/runtime/outputs/architect/design/`). Reviews own or external designs.

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

After save, reply with this exact shape:

```
Review saved at {path}. Verdict: {ship|revise|block}. Score: {N}/10.
  sensors: design-structure ok (10 questions, verdict present)
  eval:    design-review-depth {N}/10 (attempts: N)
  refs:    design/{feature_id}.md
  blockers: {list or none}
  next:    revise the design, or proceed to /product-manager:prp or /sse:plan
```
