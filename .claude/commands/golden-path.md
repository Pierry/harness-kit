---
description: The golden path. One command, idea to merged PR. Runs the full pipeline — prd → prp → plan → dev → test → pr — with sensor + eval gates at every stage.
---

Golden path. Idea → merged PR. Paved, opinionated, supported. The recommended way; not the
only way (step off any time — see Detours).

Full reference: `docs/GOLDEN-PATH.md`.

## Flags

Passed through to the SSE half (`/sse:run`):

- `--local`: stop after `/sse:test`, no PR. Dev + test locally.
- `--sdd`: spec-driven loop variant (plan once, dev↔test↔eval until PRP spec met). Local only.
- `--no-monitor`: PR opens, skip auto merge-watch.

## Steps

1. Invoke `/product-manager:run`. Drafts PRD → PRP. Wait for approval markers on both.
   Follow `.claude/agents/product-manager/guides/pipeline.md`.
2. On PRP approval, invoke `/sse:run` with any flags passed to `/golden-path`. Runs
   plan → dev → test → pr → monitor. Follow
   `.claude/agents/staff-software-engineer/guides/pipeline.md`.
3. Return the combined summary.

Reuse the same `feature_id` across both halves so artifacts land under one name. The status
bar tracks all six stages (`full-run` shape; `.claude/hooks/pipeline-prompt.sh` records intent).

## Detours

Golden path is optional. Run any stage solo instead: `/product-manager:prd | :prp`,
`/sse:plan | :dev | :test | :pr`, `/sse:run --local`, `/sse:sdd`. Resume with
`/pipeline:continue`, abandon with `/pipeline:reset`. Same sensors, same evals, same artifacts.

## Return format

Name every sensor, eval, guide that ran. Generic summaries not acceptable — list specifics so
user sees what was checked and loaded. Concatenate the PM and SSE return blocks:

```
Golden path complete. Idea → merged PR.

PRD: .claude/runtime/outputs/pm/prd/{path}
  sensors: prd-structure ok, prd-acceptance-criteria ok ({sub-checks})
  eval:    prd-quality {score}/10, prd-readiness {score}/10 (attempts: N)
  guides:  product-guidelines.md, prd-guidelines.md, writing-style.md, templates/prd.md
  refs:    business-info.md, squads/{squad}/context.md

PRP: .claude/runtime/outputs/pm/prp/{path}
  sensors: prp-structure ok, prp-context-quality ok, prp-links ok
  eval:    prp-quality {score}/10, prp-context-readiness {score}/10 (attempts: N)
  guides:  prp-guidelines.md, writing-style.md, templates/prp.md
  refs:    prd/{feature_id}.md, target repo paths probed

Plan: .claude/runtime/outputs/sse/plan/{path}
  sensors: {sensor-name} ok ({sub-check, ...}), {sensor-name} ok
  eval:    {eval-name} {score}/10 (attempts: N)
  guides:  {guide-1.md}, {guide-2.md}, skills/{area}/SKILL.md
  refs:    prp/{feature_id}.md, conventions/{area}.md

Dev: branch {branch}
  files changed: N
  commits: N ({short-sha}, ...)
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
  phases: prd-*, prp-*, plan-*, dev-*, test-*, pr-*
```

`--local` set → omit PR + Monitor lines, tell user `next: review diff, /sse:pr when ready`.
`--sdd` set → SSE half follows `/sse:sdd` (no auto PR); transcript at
`.claude/runtime/outputs/sse/sdd/{feature_id}.md`.
Phase with no sensors/eval/guides/refs → omit the line, don't print empty.
