---
description: Clear the pipeline state file. Abandons the active feature run.
---

Reset the pipeline.

1. Confirm with the user that they want to abandon the active pipeline. Show `python3 .claude/scripts/pipeline.py render` so they see what they are dropping.
2. On confirmation: `python3 .claude/scripts/pipeline.py clear`.
3. Output files under `.claude/plugins/*/outputs/` are not deleted. Only the in-memory state is cleared.

The status bar will return to idle after reset.
