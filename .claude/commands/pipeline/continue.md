---
description: Resume the active pipeline at the next pending stage.
---

Resume active pipeline.

1. Read state: `python3 .claude/scripts/pipeline.py read`. No `feature_id` or `current`, tell user pipeline idle. Suggest `/product-manager:run` or `/sse:run`.
2. Read next command: `python3 .claude/scripts/pipeline.py next`. Prints slash command to invoke.
3. Show current status line: `python3 .claude/scripts/pipeline.py render`.
4. Invoke next-stage command. Use recorded `feature_id` so artifacts land under same name.
5. After stage completes (file written, approval marker applied), post-write/post-edit hooks update state. Run `/pipeline:continue` again to chain next stage, or stop.

If state has `pipeline` but no `feature_id` yet (intent recorded, first stage not started), invoke first stage in `pipeline`.

User wants to abandon run, suggest `/pipeline:reset`.
