---
description: Clear the pipeline state file. Abandons the active feature run.
---

Reset pipeline.

1. Confirm user wants to abandon active pipeline. Show `python3 .claude/scripts/pipeline.py render` so they see what they drop.
2. On confirmation: `python3 .claude/scripts/pipeline.py clear`.
3. Output files under `.claude/runtime/outputs/` not deleted. Only in-memory state cleared.

Status bar returns to idle after reset.
