# Pipeline

Shared rules for plan, dev, test, pr stages. Edit retry, approval, publish, token accounting here.

## Stages

1. plan: generate technical plan from source PRP. Apply sensors, eval, retry up to 3.
2. dev: implement plan in code. Run lint and convention gates after each step. Retry until clean.
3. test: run project test suite. Capture results.
4. pr: open draft PR with standard template.

## Retry policy

Max attempts per stage: 3.

Trigger on:
- any sensor returns non-zero
- eval weighted total below threshold (default 8.0 for plan)
- test command exit code != 0 (dev/test only)

Strategy:
1. Read feedback.
2. Regenerate or fix only failed parts.
3. Re-run gates.

Hard stop after 3 attempts: return blocker, do not proceed.

## Approval marker

Each artifact gets:
```
<!-- approved: {YYYY-MM-DD} score={N} -->
```

Plan and PR also accept variants with `ready-for-handoff: true`.

Triggers hooks/post-eval-{stage}.sh.

## Token accounting

Phases tracked per feature_id (matches PRD/PRP feature_id from PM plugin):
- plan-generate, plan-validate
- dev-generate, dev-validate
- test-generate, test-validate
- pr-generate, pr-validate

Markers in .claude/runtime/outputs/sse/.markers/{feature_id}.{phase}.{start|end}, each `{"timestamp": ISO, "session_id": ""}`.
Flow per stage:
1. Skill writes `{stage}-generate.start` before drafting artifact.
2. Write tool fires post-write-sse.sh → writes `{stage}-generate.end` + `{stage}-validate.start`.
3. Skill appends approval marker via Edit → fires post-eval-sse.sh → writes `{stage}-validate.end` + runs scripts/token-phase.py for both phases.

Tokens land in shared file with PM plugin: `.claude/runtime/outputs/sse/tokens/{feature_id}.json`. Same file collects PM phases (prd-generate, prd-validate, prp-generate, prp-validate) and SSE phases (plan-generate, plan-validate, dev, test, pr). Totals cover full feature lifecycle.

To merge with PM tokens file, SSE token-phase.py writes to same path under this plugin's .claude/runtime/outputs/sse/tokens/, then small step in commands/run.md syncs (or symlinks) with PM tokens dir. v1: SSE keeps own .claude/runtime/outputs/sse/tokens/{feature_id}.json. v2: merge.

## Orchestrator order

1. plan: stages 1-4.
2. dev: stages 1-4 (with code-conventions gate).
3. test: runs repo test suite.
4. pr: opens draft PR.

## Stop conditions

- 3 failed attempts on same stage
- tests fail after dev
- gh CLI not available for pr stage
- missing required input after one clarification

## Conventions override

Before any code generation, read `guides/conventions-override.md` and check `cwd/.claude/conventions/{area}.md`. Project-specific rules win over agent defaults.
