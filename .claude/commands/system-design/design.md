---
description: Design a system into a rigorous System Design Doc. Routes to a topic playbook (e.g. search-engine) or the generic design skill. Sensors and evals gate.
---

Design a system. Follow .claude/agents/system-architect/guides/pipeline.md for retry and approval, and .claude/shared/pipeline-pattern.md for inputs (resolve-mark-proceed) and eval (adversarial).

Inputs are resolved, not asked (resolve-mark-proceed). Resolve scale target (users / QPS / data /
latency SLO), internal-vs-web-scale, and known constraints from any provided description plus
`context-library/`. Infer a sensible order-of-magnitude scale and mark it `ASSUMPTION: {x}`; mark
genuine unknowns `NOT FOUND - NEEDS REVIEW: {detail}` and keep going. The one permitted stop: if NO
system or problem statement exists at all, ask once for the one-liner. Everything else resolves from
context. Never stop to ask for a resolvable input.

**Route to a topic skill if one fits.** Check
`.claude/agents/system-architect/skills/{topic}/SKILL.md` (currently: search-engine, url-shortener,
rate-limiter). If the problem matches, use that skill's reference architecture. Otherwise use the generic skill
`.claude/agents/system-architect/skills/design/SKILL.md`.

Compute feature_id = {YYYY-MM-DD}-{slug}.

Read:
- .claude/agents/system-architect/guides/design-method.md
- .claude/agents/system-architect/guides/writing-style.md
- .claude/agents/system-architect/guides/templates/system-design.md
- .claude/agents/system-architect/guides/pipeline.md
- .claude/agents/system-architect/guides/examples/good-system-design-example.md
- the matched topic skill, if any

Save to .claude/runtime/outputs/architect/design/{feature_id}.md.

Sensors: .claude/agents/system-architect/sensors/design-structure.md, .../sensors/design-rigor.md.
Evals: .claude/agents/system-architect/evals/design-quality.md.

Run the evals **adversarially**: dispatch a fresh evaluator via the Task tool (`subagent_type: general-purpose`) that did not author this design. Hand it only the artifact path and the one rubric path; it scores against the rubric and reports the weighted total plus the low-scoring dimensions. Below threshold (8.0) retries per pipeline.md, regenerating only the flagged dimensions.

After save, reply with this exact shape (name the actual skill/sensors/evals/guides that ran):

```
Design saved at {path}. Score: {N}/10.
  skill:   {search-engine | design (generic)}
  sensors: design-structure ok, design-rigor ok
  eval:    design-quality {N}/10 (attempts: N)
  guides:  design-method.md, writing-style.md, templates/system-design.md
  canon:   {names applied}
  next:    /system-design:review
```
