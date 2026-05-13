---
name: prp
description: Generate a Product Requirements Prompt for engineering handoff. Needs an approved PRD. Sensors, link validation, and eval gates.
user_invocable: true
---

Generate a PRP. Follow guides/pipeline.md for retry, approval, and publish.

Source PRD: if user passes a path, use it. Else pick the most recent in outputs/prd/. None found, abort. Tell user to run /product-manager:prd first. hooks/pre-prp-check.sh blocks if the PRD lacks the approved marker.

Compute feature_id from the source PRD filename (basename without .md). Save the PRP to outputs/prp/{feature_id}.md so it matches.

Before generating, write the phase start marker:

```
outputs/.markers/{feature_id}.prp-generate.start
```

Content: `{"timestamp": "<ISO-8601 UTC now>", "session_id": ""}`

Read:
- the source PRD
- guides/prp-guidelines.md
- guides/writing-style.md
- guides/templates/prp.md
- guides/pipeline.md
- guides/examples/good-prp-example.md

Explore target repos. Ask user for repo paths if not provided. Use Grep and Read to map files. Capture file:line. Never invent paths.

Save to outputs/prp/{feature_id}.md.

Sensors: sensors/prp-structure.md, sensors/prp-context-quality.md, sensors/prp-links.md.

Evals: evals/prp-quality.md, evals/prp-context-readiness.md.

After save reply: PRP saved at {path}. Score: {N}/10. Ready for handoff.
