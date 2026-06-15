---
description: Run the full PM pipeline. PRD then PRP, with sensor and eval gates between each.
---

Run end to end.

1. Invoke /product-manager:prd. Wait for approval marker.
2. .claude/runtime/hooks/product-manager/pre-prp-check.sh validates PRD.
3. Invoke /product-manager:prp using just-approved PRD.
4. Return summary.

Follow .claude/agents/product-manager/guides/pipeline.md. Read .claude/agents/product-manager.md for inputs and rules.

Return format. Name every sensor, eval, guide that ran. Generic summaries not acceptable, list specifics so user sees what was checked and loaded.

```
Pipeline complete.

PRD: .claude/runtime/outputs/pm/prd/{path}
  sensors: prd-structure ok, prd-acceptance-criteria ok ({sub-checks})
  eval:    prd-quality {score}/10, prd-readiness {score}/10 (attempts: N)
  guides:  product-guidelines.md, prd-guidelines.md, writing-style.md, templates/prd.md
  refs:    business-info.md, squads/{squad}/context.md

PRP: .claude/runtime/outputs/pm/prp/{path}
  sensors: prp-structure ok, prp-context-quality ok, prp-links ok
  eval:    prp-quality {score}/10, prp-context-readiness {score}/10 (attempts: N)
  guides:  prp-guidelines.md, writing-style.md, templates/prp.md
  refs:    prd/{feature_id}.md, target repo paths probed

Tokens: outputs/tokens/{feature_id}.json
  totals: in={N} out={N} cache_r={N}
  phases: prd-generate, prd-validate, prp-generate, prp-validate

Confluence: {published to {space-key}: {url} | skipped, reason}

Blockers:
- {file:line, issue, fix}
```

Phase has no sensors/eval/guides/refs, omit line rather than print empty one.
