# Pipeline

Shared rules for plan, dev, test, pr stages. Edit retry, approval, publish, and token accounting here.

## Stages

1. plan: generate a technical plan from the source PRP. Apply sensors, eval, retry up to 3.
2. dev: implement the plan in code. Run lint and convention gates after each step. Retry until clean.
3. test: run the project test suite. Capture results.
4. pr: open a draft PR with the standard template.

## Retry policy

Max attempts per stage: 3.

Trigger on:
- any sensor returns non-zero
- eval weighted total below threshold (default 8.0 for plan)
- test command exit code != 0 (dev/test only)

Strategy:
1. Read the feedback.
2. Regenerate or fix only the failed parts.
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

Phases tracked per feature_id (matches PRD/PRP feature_id from the PM plugin):
- plan-generate, plan-validate
- dev
- test
- pr

Markers in outputs/.markers/{feature_id}.{phase}.{start|end}, each `{"timestamp": ISO, "session_id": ""}`. Skills write .start; hooks write .end. After each phase ends, the publish hook calls scripts/token-phase.py.

Tokens land in a shared file with the PM plugin: `outputs/tokens/{feature_id}.json`. The same file collects both PM phases (prd-generate, prd-validate, prp-generate, prp-validate) and SSE phases (plan-generate, plan-validate, dev, test, pr). Totals cover the full feature lifecycle.

To merge with the PM tokens file, the SSE token-phase.py writes to the same path under this plugin's outputs/tokens/, then a small step in commands/run.md syncs (or symlinks) with the PM tokens dir. For simplicity v1, SSE keeps its own outputs/tokens/{feature_id}.json. v2: merge.

## Orchestrator order

1. plan: stages 1-4.
2. dev: stages 1-4 (with code-conventions gate).
3. test: runs repo test suite.
4. pr: opens draft PR.

## Stop conditions

- 3 failed attempts on the same stage
- tests fail after dev
- gh CLI not available for pr stage
- missing required input after one clarification

## Conventions override

Before any code generation, read `guides/conventions-override.md` and check `cwd/.claude/conventions/{area}.md`. Project-specific rules win over plugin defaults.
