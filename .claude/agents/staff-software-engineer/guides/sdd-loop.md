# SDD Loop

Spec-driven dev loop. Used by `/sse:sdd`. Wraps plan + dev + test in goal-loop. Stops local. No PR.

Inspired by Claude Code `/goal` (May 2026): worker model attempts work, independent evaluator checks goal met, retry until met or cap hit.

## When to use

- Want to iterate locally on a feature until spec satisfied
- Not ready to push or open PR
- PRP exists with testable success criteria + validation gates

When not:
- No PRP, run `/product-manager:prp` first
- Want PR opened automatically, use `/sse:run`
- PRP success criteria vague, sensor blocks, fix PRP first

## Inputs

- source PRP: latest approved in `.claude/runtime/outputs/pm/prp/` or path arg
- feature_id derived from PRP filename

## Predicate (goal completion condition)

Built from PRP:
- every bullet in `## 3) What` → `Success criteria (verifiable):` MET (code + test exist)
- every command in `## 6) Validation gates` bash block exit 0

Eval rubric: `evals/spec-satisfied.md`. Independent session reads PRP + dev summary + test report + git diff. Returns PASS or FAIL with `next_iter_focus`.

## Algorithm

```
1. pre-flight
   - sensor: prp-has-acceptance-criteria → block if FAIL
   - read PRP, extract criteria + gates

2. plan once
   - invoke /sse:plan (normal gates, eval, retry up to 3)
   - get approved plan

3. goal loop (cap = 3 iters)
   iter = 1
   while iter <= 3:
     a. /sse:dev step (worker)
        - if iter > 1, focus on `next_iter_focus` from prior eval
     b. /sse:test
     c. supervisor eval: spec-satisfied.md
        - fresh session, no worker context
        - reads PRP + dev/{id}.md + test/{id}.md + git diff
     d. verdict == PASS:
        - write sdd/{feature_id}.md transcript
        - exit loop, success
     e. verdict == FAIL:
        - append iter result to sdd transcript
        - iter += 1
        - continue

4. cap hit (iter > 3)
   - hard stop
   - write sdd/{feature_id}.md with full transcript + final verdict
   - return blocker, list NOT_MET criteria + UNCLEAR items
```

## Output artifact

`.claude/runtime/outputs/sse/sdd/{feature_id}.md`:

```markdown
# SDD Loop: {feature_id}

Source PRP: {path}
Iterations: {N}
Final verdict: PASS | FAIL (cap hit)

## Iteration 1
- dev summary: {path}
- test report: {path}
- eval verdict: FAIL
- next focus: {string}

## Iteration 2
...

## Final state
- branch: {branch}
- commits: {N}
- criteria MET: {N}/{total}
- gates GREEN: {N}/{total}
- manual pending: [...]

## Next step
PASS → review diff, run `/sse:pr` when ready
FAIL → address blockers, re-run `/sse:sdd`
```

## Token accounting

Per-iter phases tracked under same `.markers/` dir as standard pipeline:
- `{feature_id}.sdd-iter{N}-dev.{start,end}`
- `{feature_id}.sdd-iter{N}-test.{start,end}`
- `{feature_id}.sdd-iter{N}-eval.{start,end}`

Reuses existing `scripts/staff-software-engineer/token-phase.py`, pass phase name as arg.

## Stop conditions

- 3 iters complete without PASS
- pre-flight sensor fails (PRP not testable)
- `/sse:plan` hard stops (3 plan retries exhausted)
- user interrupts mid-loop

## Why separate from /sse:run

`/sse:run` is monolithic plan→dev→test→pr. SDD loop adds iter inside dev+test, omits pr. Two reasons:

1. **Local dev workflow**: want repeated dev↔test cycle with spec-judge feedback, not single shot
2. **PR gate**: human reviews loop transcript before pushing. Auto-PR on goal PASS is too eager, supervisor can be wrong

`/sse:run --local` exists as cheap alternative (skip pr stage, no loop). SDD loop is the spec-driven mode.

## References

- predicate source: `guides/templates/prp.md` sections 3, 6 (product-manager plugin)
- worker stage: `commands/sse/dev.md`, `commands/sse/test.md`
- evaluator: `evals/spec-satisfied.md`
- gating sensor: `sensors/prp-has-acceptance-criteria.md`
