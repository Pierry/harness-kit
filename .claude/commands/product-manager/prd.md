---
description: Generate a Product Requirements Document for an team squad. Business-facing artifact. Sensors and evals gate.
---

Generate PRD. Follow .claude/plugins/product-manager/guides/pipeline.md for retry, approval, publish.

Print header card before drafting and footer card after gates run. Format: .claude/scripts/stage-card.md.

Ask once if missing: squad, problem in 1-2 sentences, customers, hypothesis, bet link, stage.

Compute feature_id = {YYYY-MM-DD}-{squad}-{slug}. Before generating, write phase start marker:

```
.claude/plugins/product-manager/outputs/.markers/{feature_id}.prd-generate.start
```

Content: `{"timestamp": "<ISO-8601 UTC now>", "session_id": ""}`

Read:
- .claude/plugins/product-manager/guides/product-guidelines.md
- .claude/plugins/product-manager/guides/prd-guidelines.md
- .claude/plugins/product-manager/guides/writing-style.md
- .claude/plugins/product-manager/guides/templates/prd.md
- .claude/plugins/product-manager/guides/pipeline.md
- .claude/plugins/product-manager/guides/examples/good-prd-example.md

Save to .claude/plugins/product-manager/outputs/prd/{feature_id}.md.

Sensors: .claude/plugins/product-manager/sensors/prd-structure.md, .claude/plugins/product-manager/sensors/prd-acceptance-criteria.md.

Evals: .claude/plugins/product-manager/evals/prd-quality.md, .claude/plugins/product-manager/evals/prd-readiness.md.

After save, reply with this exact shape (name actual sensors/evals/guides that ran, don't abbreviate):

```
PRD saved at {path}.
  sensors: prd-structure ok, prd-acceptance-criteria ok
  eval:    prd-quality {N}/10, prd-readiness {N}/10
  guides:  product-guidelines.md, prd-guidelines.md, writing-style.md, templates/prd.md
  refs:    business-info.md, squads/{squad}/context.md
  next:    /product-manager:prp
```
