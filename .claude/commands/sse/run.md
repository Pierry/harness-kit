---
description: Run the full engineering pipeline. Plan, dev, test, pr in sequence. Pass --local to stop after test (no PR). Pass --sdd for spec-driven loop variant.
---

Run end to end.

## Flags

- `--local`: skip /sse:pr + /sse:pr-monitor. Stop after /sse:test. Use when want dev+test locally without push.
- `--sdd`: hand off to `/sse:sdd` instead (spec-driven loop, plan once + dev↔test↔eval loop, also local-only). See `.claude/commands/sse/sdd.md`. Mutually exclusive with `--local`.
- `--no-monitor`: skip /sse:pr-monitor only. PR still opens.

## Steps

1. `--sdd` set → invoke /sse:sdd with same args (minus --sdd). Return its result. Skip rest.
2. Invoke /sse:plan. Wait for approval marker on plan.
3. Invoke /sse:dev. Implements plan in code.
4. Invoke /sse:test. Runs project test suite.
5. `--local` set → stop here. Print summary (omit PR + Monitor lines). Tell user `next: review diff, /sse:pr when ready`.
6. Invoke /sse:pr. Opens pull request.
7. Invoke /sse:pr-monitor. Arms backoff polling, auto-clears pipeline state on merge. Skip if user passed `--no-monitor` or `gh pr view` already returns MERGED.
8. Return summary.

Follow .claude/agents/staff-software-engineer/guides/pipeline.md for retry, approval markers, token accounting, publish behavior.

Return format. Name every sensor, eval, guide that ran. Generic summaries not acceptable — list specifics so user sees what was checked and loaded.

```
Engineering pipeline complete.

Plan: .claude/runtime/outputs/sse/plan/{path}
  sensors: {sensor-name} ok ({sub-check, sub-check, ...}), {sensor-name} ok
  eval:    {eval-name} {score}/10 (attempts: N)
  guides:  {guide-1.md}, {guide-2.md}, skills/{area}/SKILL.md
  refs:    prp/{feature_id}.md, conventions/{area}.md

Dev: branch {branch}
  files changed: N
  commits: N ({short-sha}, {short-sha}, ...)
  sensors: code-conventions ok, test-coverage ok
  guides:  coding-style.md, commit-style.md, skills/{area}/SKILL.md
  refs:    plan/{feature_id}.md, conventions/{area}.md

Test: .claude/runtime/outputs/sse/test/{path}
  command: {detected-test-command}
  passed:  N, failed: M
  duration: {seconds}s

PR: {url}
  title: {title}
  draft: yes|no
  guides: commit-style.md
  refs:   plan/{feature_id}.md, dev/{feature_id}.md

Monitor: {armed, first check in 3min, escalates to 30min cap | skipped, reason}

Tokens: outputs/tokens/{feature_id}.json
  totals: in={N} out={N} cache_r={N}
  phases: plan-generate, plan-validate, dev-generate, dev-validate, test-generate, test-validate, pr-generate, pr-validate

Confluence: {published to {space-key}: {url} | skipped, reason}

Blockers:
- {file:line, issue, fix}
```

Phase has no sensors/eval/guides/refs, omit line for that phase rather than print empty one.
