---
description: Generate a Product Requirements Prompt for engineering handoff. Needs an approved PRD. Sensors, link validation, and eval gates.
---

Generate a PRP. Follow .claude/plugins/product-manager/guides/pipeline.md for retry, approval, and publish.

Source PRD: if user passes a path, use it. Else pick the most recent in .claude/plugins/product-manager/outputs/prd/. None found, abort. Tell user to run /product-manager:prd first. .claude/plugins/product-manager/hooks/pre-prp-check.sh blocks if the PRD lacks the approved marker.

Compute feature_id from the source PRD filename (basename without .md). Save the PRP to .claude/plugins/product-manager/outputs/prp/{feature_id}.md so it matches.

Before generating, write the phase start marker:

```
.claude/plugins/product-manager/outputs/.markers/{feature_id}.prp-generate.start
```

Content: `{"timestamp": "<ISO-8601 UTC now>", "session_id": ""}`

Read:
- the source PRD
- .claude/plugins/product-manager/guides/prp-guidelines.md
- .claude/plugins/product-manager/guides/writing-style.md
- .claude/plugins/product-manager/guides/templates/prp.md
- .claude/plugins/product-manager/guides/pipeline.md
- .claude/plugins/product-manager/guides/examples/good-prp-example.md

Explore target repos. Ask user for repo paths if not provided. Use Grep and Read to map files. Capture file:line. Never invent paths.

Save to .claude/plugins/product-manager/outputs/prp/{feature_id}.md.

Sensors: .claude/plugins/product-manager/sensors/prp-structure.md, .claude/plugins/product-manager/sensors/prp-context-quality.md, .claude/plugins/product-manager/sensors/prp-links.md.

Evals: .claude/plugins/product-manager/evals/prp-quality.md, .claude/plugins/product-manager/evals/prp-context-readiness.md.

After save reply: PRP saved at {path}. Score: {N}/10. Ready for handoff.
