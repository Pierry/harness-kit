---
name: hk-golden-path
description: Take a feature from idea to merged PR with Harness Kit's gated PRD, PRP, plan, development, test, and PR pipeline. Use for end-to-end feature delivery or "golden path" requests.
---

# Harness Kit golden path

Read `../_shared/compatibility.md`, then read and execute `.claude/commands/golden-path.md` from the
target repository.

Treat the user's remaining prompt as the idea and flags for the run. Execute referenced command
specifications yourself; slash-command syntax in those files is routing notation, not a requirement
to invoke Claude Code.

For the PM and engineering halves, read their orchestrator definitions and pipeline guides before
starting. Reuse one `feature_id`, preserve every approval gate, and return the exact combined summary
required by the golden-path specification.
