---
description: Run the full engineering pipeline. Plan, dev, test, pr in sequence.
---

Run end to end.

1. Invoke /sse:plan. Wait for the approval marker on the plan.
2. Invoke /sse:dev. Implements the plan in code.
3. Invoke /sse:test. Runs the project test suite.
4. Invoke /sse:pr. Opens the pull request.
5. Return summary.

Follow .claude/plugins/staff-software-engineer/guides/pipeline.md for retry, approval markers, token accounting, and publish behavior.

Return format:

```
Engineering pipeline complete.

Plan: .claude/plugins/staff-software-engineer/outputs/plan/{path}
  sensors: passed (attempts: N)
  eval: {score}/10

Dev: branch {branch}
  files changed: N
  commits: N
  gates: code-style ok, conventions ok

Test: .claude/plugins/staff-software-engineer/outputs/test/{path}
  passed: N, failed: M

PR: {url}
  draft: yes|no

Confluence: {published | skipped, reason}

Blockers:
- {file:line, issue, fix}
```
