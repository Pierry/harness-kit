---
description: Run the full PM pipeline. PRD then PRP, with sensor and eval gates between each.
---

Run end to end.

1. Invoke /product-manager:prd. Wait for the approval marker.
2. .claude/plugins/product-manager/hooks/pre-prp-check.sh validates the PRD.
3. Invoke /product-manager:prp using the just-approved PRD.
4. Return summary.

Follow .claude/plugins/product-manager/guides/pipeline.md. Read .claude/agents/product-manager.md for inputs and rules.

Return format. Name every sensor, eval, and guide that ran. Generic summaries are not acceptable — list specifics so the user sees what was checked and what was loaded.

```
Pipeline complete.

PRD: .claude/plugins/product-manager/outputs/prd/{path}
  sensors: prd-structure ok, prd-acceptance-criteria ok ({sub-checks})
  eval:    prd-quality {score}/10, prd-readiness {score}/10 (attempts: N)
  guides:  product-guidelines.md, prd-guidelines.md, writing-style.md, templates/prd.md
  refs:    business-info.md, squads/{squad}/context.md

PRP: .claude/plugins/product-manager/outputs/prp/{path}
  sensors: prp-structure ok, prp-context-quality ok, prp-links ok
  eval:    prp-quality {score}/10, prp-context-readiness {score}/10 (attempts: N)
  guides:  prp-guidelines.md, writing-style.md, templates/prp.md
  refs:    prd/{feature_id}.md, target repo paths probed

Confluence: {published to {space-key}: {url} | skipped, reason}

Blockers:
- {file:line, issue, fix}
```

If a phase has no sensors/eval/guides/refs, omit that line rather than printing an empty one.
