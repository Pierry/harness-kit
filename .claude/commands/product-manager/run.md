---
description: Run the full PM pipeline. PRD then PRP, with sensor and eval gates between each.
---

Run end to end.

1. Invoke /product-manager:prd. Wait for the approval marker.
2. .claude/plugins/product-manager/hooks/pre-prp-check.sh validates the PRD.
3. Invoke /product-manager:prp using the just-approved PRD.
4. Return summary.

Follow .claude/plugins/product-manager/guides/pipeline.md. Read .claude/agents/product-manager.md for inputs and rules.

Return format:

```
Pipeline complete.

PRD: .claude/plugins/product-manager/outputs/prd/{path}
  sensors: passed (attempts: N)
  eval: {score}/10

PRP: .claude/plugins/product-manager/outputs/prp/{path}
  sensors: passed (attempts: N)
  eval: {score}/10

Confluence: {published | skipped, reason}

Blockers:
- {file:line, issue, fix}
```
