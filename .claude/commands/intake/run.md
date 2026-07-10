---
description: Harvest context from the target repo and context-library into one intake artifact, so later stages never stop to ask. First stage of the pipeline.
---

Run intake. Record intent so the status bar tracks it:

```
.claude/scripts/pipeline.py intent intake
```

Dispatch the **intake subagent** via the Task tool (`subagent_type: intake`), so the heavy repo
exploration runs in an isolated context and only the distilled `intake.md` returns. Pass the raw idea
(and any repo path the user named) as the prompt.

The subagent explores the repo + context-library, computes `feature_id`, attaches it with
`pipeline.py set-feature`, and writes `.claude/runtime/outputs/intake/{feature_id}.md` with a structured
frontmatter (`squad`, `repos`, `customers`, `metric`, `unknowns`) and an `<!-- approved: -->` marker.

When the subagent returns, relay its report and surface `unknowns`:

```
intake saved at {path}.
  feature_id: {feature_id}
  unknowns:   {n} — {short list or "none"}
  next:       /product-manager:prd
```

If `unknowns` is non-empty, name them so the human can fill any that matter before the PRD gate. Do not
block: the pipeline proceeds with the markers in place.
