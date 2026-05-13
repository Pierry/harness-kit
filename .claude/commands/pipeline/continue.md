---
description: Resume the active pipeline at the next pending stage.
---

Resume the active pipeline.

1. Read state: `python3 .claude/scripts/pipeline.py read`. If no `feature_id` or `current`, tell the user the pipeline is idle and suggest `/product-manager:run` or `/sse:run`.
2. Read the next command: `python3 .claude/scripts/pipeline.py next`. This prints the slash command to invoke.
3. Show the current status line: `python3 .claude/scripts/pipeline.py render`.
4. Invoke the next-stage command. Use the recorded `feature_id` so artifacts land under the same name.
5. After the stage completes (file written, approval marker applied), the post-write/post-edit hooks update state automatically. Run `/pipeline:continue` again to chain into the next stage, or stop here.

If state has `pipeline` but no `feature_id` yet (intent recorded, first stage not started), invoke the first stage in `pipeline`.

If the user wants to abandon the run instead, suggest `/pipeline:reset`.
