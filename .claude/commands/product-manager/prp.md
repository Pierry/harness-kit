---
description: Generate a Product Requirements Prompt for engineering handoff. Needs an approved PRD. Sensors, link validation, and eval gates.
---

Generate PRP. Follow .claude/plugins/product-manager/guides/pipeline.md for retry, approval, publish.

Print header card before drafting and footer card after gates run. Format: .claude/scripts/stage-card.md.

Source PRD: user passes path, use it. Else pick most recent in .claude/plugins/product-manager/outputs/prd/. None found, abort. Tell user to run /product-manager:prd first. .claude/plugins/product-manager/hooks/pre-prp-check.sh blocks if PRD lacks approved marker.

Compute feature_id from source PRD filename (basename without .md). Save PRP to .claude/plugins/product-manager/outputs/prp/{feature_id}.md so it matches.

Before generating, write phase start marker:

```
.claude/plugins/product-manager/outputs/.markers/{feature_id}.prp-generate.start
```

Content: `{"timestamp": "<ISO-8601 UTC now>", "session_id": ""}`

Read:
- source PRD
- .claude/plugins/product-manager/guides/prp-guidelines.md
- .claude/plugins/product-manager/guides/writing-style.md
- .claude/plugins/product-manager/guides/templates/prp.md
- .claude/plugins/product-manager/guides/pipeline.md
- .claude/plugins/product-manager/guides/examples/good-prp-example.md

Explore target repos. Ask user for repo paths if not provided. Use Grep and Read to map files. Capture file:line. Never invent paths.

Save to .claude/plugins/product-manager/outputs/prp/{feature_id}.md.

Sensors: .claude/plugins/product-manager/sensors/prp-structure.md, .claude/plugins/product-manager/sensors/prp-context-quality.md, .claude/plugins/product-manager/sensors/prp-links.md.

Evals: .claude/plugins/product-manager/evals/prp-quality.md, .claude/plugins/product-manager/evals/prp-context-readiness.md.

After save, reply with this exact shape (name actual sensors/evals/guides that ran):

```
PRP saved at {path}.
  sensors: prp-structure ok, prp-context-quality ok, prp-links ok
  eval:    prp-quality {N}/10, prp-context-readiness {N}/10
  guides:  prp-guidelines.md, writing-style.md, templates/prp.md
  refs:    prd/{feature_id}.md, {target repo paths probed}
  next:    /sse:plan (ready for handoff)
```
