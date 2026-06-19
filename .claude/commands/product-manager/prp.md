---
description: Generate a Product Requirements Prompt for engineering handoff. Needs an approved PRD. Sensors, link validation, and eval gates.
---

Generate PRP. Follow .claude/agents/product-manager/guides/pipeline.md for retry, approval, publish.

Print header card before drafting and footer card after gates run. Format: .claude/scripts/stage-card.md.

Source PRD: user passes path, use it. Else pick most recent in .claude/runtime/outputs/pm/prd/. None found, abort. Tell user to run /product-manager:prd first. .claude/runtime/hooks/product-manager/pre-prp-check.sh blocks if PRD lacks approved marker.

Compute feature_id from source PRD filename (basename without .md). Save PRP to .claude/runtime/outputs/pm/prp/{feature_id}.md so it matches.

Before generating, write the phase start marker by running this script. Do NOT inline `date`/`printf` (command-substitution + redirect always trips the permission prompt):

```
.claude/scripts/marker.sh start .claude/runtime/outputs/pm/.markers/{feature_id}.prp-generate.start
```

Read:
- source PRD
- .claude/agents/product-manager/guides/prp-guidelines.md
- .claude/agents/product-manager/guides/writing-style.md
- .claude/agents/product-manager/guides/templates/prp.md
- .claude/agents/product-manager/guides/pipeline.md
- .claude/agents/product-manager/guides/examples/good-prp-example.md

Explore target repos. Ask user for repo paths if not provided. Use Grep and Read to map files. Capture file:line. Never invent paths.

Save to .claude/runtime/outputs/pm/prp/{feature_id}.md.

Sensors: run deterministically via the committed runner. Do NOT improvise inline grep/for loops:

```
.claude/runtime/scripts/product-manager/run-sensors.sh .claude/runtime/outputs/pm/prp/{feature_id}.md .claude/agents/product-manager/sensors/prp-structure.md .claude/agents/product-manager/sensors/prp-context-quality.md .claude/agents/product-manager/sensors/prp-links.md
```

Exit 0 = all pass; exit 1 = a sensor blocked (the runner prints which). Read a sensor spec with the Read tool only to explain a failure; never `cat` it in a loop.

Evals: .claude/agents/product-manager/evals/prp-quality.md, .claude/agents/product-manager/evals/prp-context-readiness.md.

After save, reply with this exact shape (name actual sensors/evals/guides that ran):

```
PRP saved at {path}.
  sensors: prp-structure ok, prp-context-quality ok, prp-links ok
  eval:    prp-quality {N}/10, prp-context-readiness {N}/10
  guides:  prp-guidelines.md, writing-style.md, templates/prp.md
  refs:    prd/{feature_id}.md, {target repo paths probed}
  next:    /sse:plan (ready for handoff)
```
