---
name: hk-product-manager
description: Create or continue Harness Kit product artifacts, including a gated PRD, PRP, or the full PRD-to-PRP pipeline. Use for product requirements, engineering handoff, or PM pipeline requests.
---

# Harness Kit product manager

Read `../_shared/compatibility.md` and `.claude/agents/product-manager.md`.

Route the requested action to one command specification:

- PRD: `.claude/commands/product-manager/prd.md`
- PRP: `.claude/commands/product-manager/prp.md`
- Full PM pipeline or no explicit action: `.claude/commands/product-manager/run.md`

Read the selected specification and execute it directly. For a full run, execute the PRD and PRP
specifications in order rather than trying to invoke Claude slash commands. Preserve sensor, eval,
approval, marker, artifact, and return-format requirements.
