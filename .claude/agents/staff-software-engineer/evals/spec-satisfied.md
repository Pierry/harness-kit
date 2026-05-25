# Eval: Spec Satisfied

Type: LLM-judge (supervisor)
Mode: goal predicate
Verdict: PASS or FAIL

Decide if current repo state satisfies source PRP. Run by independent session (no prior context from worker turn) to avoid worker self-judging.

## Inputs

- source PRP: `.claude/runtime/outputs/pm/prp/{feature_id}.md`
- latest dev summary: `.claude/runtime/outputs/sse/dev/{feature_id}.md`
- latest test report: `.claude/runtime/outputs/sse/test/{feature_id}.md`
- diff: `git diff {base}...HEAD` on dev branch
- **optional richer context** (per `.claude/shared/context-strategy.md`):
  - cached pack `.claude/runtime/cache/repomix/{feature_id}.xml` if present → read for surrounding code
  - cached graph `.claude/runtime/cache/graphify/{slug}/graphify-out/graph.json` if present → query for callers of touched symbols (impact analysis)

## Rubric

Walk each criterion. For each, mark MET / NOT MET / UNCLEAR with evidence (file:line, test name, or diff hunk).

### 1. Success criteria coverage
Every bullet under PRP section 3 "Success criteria (verifiable)" mapped to:
- code change that implements it (file:line), AND
- test that asserts it (test name)

Missing either side → NOT MET.

### 2. Validation gates green
Every command in PRP section 6 "Validation gates" bash block exit 0 in latest test report. UNCLEAR if command not run.

### 3. Manual verification items
Each `- [ ]` under "Manual verification" in PRP. Worker cannot tick these — flag as PENDING for user. Do not block goal on these; report separately.

### 4. Scope discipline
No code change outside PRP "Repos and files touched" without justification in dev summary. Out-of-scope diff hunks → flag for review, not auto-fail.

## Verdict

- All success criteria MET + all validation gates green → **PASS**
- Any criterion NOT MET → **FAIL** with specific next-iter focus
- Any UNCLEAR → **FAIL** (treat as not satisfied; iter again or add evidence)

## Output

```json
{
  "verdict": "PASS|FAIL",
  "criteria": [
    {"criterion": "...", "status": "MET|NOT_MET|UNCLEAR", "evidence": "file:line | test name | diff hunk"}
  ],
  "validation_gates": [
    {"command": "...", "exit_code": 0, "status": "GREEN|RED|NOT_RUN"}
  ],
  "manual_pending": ["..."],
  "scope_flags": ["..."],
  "next_iter_focus": "specific fix for FAIL; omit on PASS"
}
```

## On FAIL

`/sse:sdd` loop reads `next_iter_focus`, regenerates dev step targeting only that. Re-runs test. Re-evals.

Max 3 iters. Cap hit → hard stop, write loop transcript + final verdict to `.claude/runtime/outputs/sse/sdd/{feature_id}.md`, return blocker.
