---
name: hk-pipeline
description: Inspect, continue, or reset an existing Harness Kit pipeline from its persisted on-disk state. Use to resume interrupted delivery or abandon the active feature safely.
---

# Harness Kit pipeline state

Read `../_shared/compatibility.md`.

Route `continue`, `resume`, or no explicit action to `.claude/commands/pipeline/continue.md`. Route
`reset` or `abandon` to `.claude/commands/pipeline/reset.md`.

Read the selected command specification and execute it directly. Use `.claude/scripts/pipeline.py`
as specified; do not reconstruct or delete state ad hoc. When continuing, route the next stage to
its command markdown and execute it in the current Codex session.
