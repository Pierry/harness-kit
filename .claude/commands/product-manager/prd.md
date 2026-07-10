---
description: Generate a Product Requirements Document for an team squad. Business-facing artifact. Sensors and evals gate.
---

Generate PRD. Follow .claude/agents/product-manager/guides/pipeline.md for retry, approval, publish, and .claude/shared/pipeline-pattern.md for inputs (resolve-mark-proceed) and eval (adversarial).

Print header card before drafting and footer card after gates run. Format: .claude/scripts/stage-card.md.

Inputs come from intake, not from the human. Read `.claude/runtime/outputs/intake/{feature_id}.md`
first and take squad, problem, customers, hypothesis, metric, and repos from it. Apply
**resolve-mark-proceed**: use what intake resolved; for anything intake left as `NEEDS REVIEW`, carry the
same `NOT FOUND - NEEDS REVIEW: {detail}` marker into the PRD and keep going. Never stop to ask. If no
intake artifact exists, run `/intake:run` first. (The evals tolerate up to five unresolved markers.)

The feature_id is set by intake (`pipeline.py set-feature`). Before generating, write the phase start marker by running this script. Do NOT inline `date`/`printf` (command-substitution + redirect always trips the permission prompt):

```
.claude/scripts/marker.sh start .claude/runtime/outputs/pm/.markers/{feature_id}.prd-generate.start
```

Read:
- .claude/runtime/outputs/intake/{feature_id}.md
- .claude/agents/product-manager/guides/product-guidelines.md
- .claude/agents/product-manager/guides/prd-guidelines.md
- .claude/agents/product-manager/guides/writing-style.md
- .claude/agents/product-manager/guides/templates/prd.md
- .claude/agents/product-manager/guides/pipeline.md
- .claude/agents/product-manager/guides/examples/good-prd-example.md

Save to .claude/runtime/outputs/pm/prd/{feature_id}.md.

Sensors: run deterministically via the committed runner. Do NOT improvise inline grep/for loops:

```
.claude/runtime/scripts/product-manager/run-sensors.sh .claude/runtime/outputs/pm/prd/{feature_id}.md .claude/agents/product-manager/sensors/prd-structure.md .claude/agents/product-manager/sensors/prd-acceptance-criteria.md
```

Exit 0 = all pass; exit 1 = a sensor blocked (the runner prints which). Read a sensor spec with the Read tool only to explain a failure; never `cat` it in a loop.

Evals: .claude/agents/product-manager/evals/prd-quality.md, .claude/agents/product-manager/evals/prd-readiness.md.

Run the evals **adversarially**: dispatch a fresh evaluator via the Task tool (`subagent_type: general-purpose`) that did not author this PRD. Hand it only the artifact path and the two rubric paths, and instruct it to score against the rubrics and report weighted totals plus the specific low-scoring dimensions. The author never grades its own work; the fresh context is what makes the score honest. Below threshold (8.0) retries per the pipeline.md policy, regenerating only the dimensions the evaluator flagged.

After save, reply with this exact shape (name actual sensors/evals/guides that ran, don't abbreviate):

```
PRD saved at {path}.
  sensors: prd-structure ok, prd-acceptance-criteria ok
  eval:    prd-quality {N}/10, prd-readiness {N}/10
  guides:  product-guidelines.md, prd-guidelines.md, writing-style.md, templates/prd.md
  refs:    business-info.md, squads/{squad}/context.md
  next:    /product-manager:prp
```
