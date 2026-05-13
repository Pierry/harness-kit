---
description: Generate a Product Requirements Document for an team squad. Business-facing artifact. Sensors and evals gate.
---

Generate a PRD. Follow .claude/plugins/product-manager/guides/pipeline.md for retry, approval, and publish.

Ask once if missing: squad, problem in 1-2 sentences, customers, hypothesis, bet link, stage.

Compute feature_id = {YYYY-MM-DD}-{squad}-{slug}. Before generating, write the phase start marker:

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

After save reply: PRD saved at {path}. Score: {N}/10.
