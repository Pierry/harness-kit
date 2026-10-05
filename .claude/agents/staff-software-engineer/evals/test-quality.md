# Eval: Test Quality

Type: LLM-judge
Mode: quality gate
Threshold: weighted total >= 8.0

Score each dimension 0-10. Cite test names or output lines when below 7. Weighted total = sum(score x weight%) / 100.

## Rubric

Checks under each dimension are atomic yes/no tests (`- check:` asked to the judge, `- absent:` a regex run in code). Score a dimension by the share of its checks met; use anchors to break ties. Name failed checks in feedback.

### Result accuracy (weight 25%)
Does Result field (pass | fail) match exit code and counts? No misreporting.

- check: The report states a result of pass or fail.
- check: The stated result is consistent with the reported exit code and failure count.

### Failure detail (weight 25%)
If failures occurred, failing test names listed with enough context (file:line, assertion message)? If pass, Failures explicitly `none`?

- check: The report has a failures entry that is either `none` or lists failing tests.
- check: Every failing test listed includes a file and line or an assertion message.

### Coverage of changes (weight 20%)
Tests run cover files changed in dev phase? Gaps called out?

- check: The report says which changed files the tests cover.
- check: The report names changed files or behaviors that no test covers, or states there are none.

### Command reproducibility (weight 15%)
Command field real shell command another engineer could run as-is? Includes filters or args if used.

- check: The report gives the exact shell command that ran the tests.

### Duration sanity (weight 10%)
Duration reported with unit? Plausible for suite size?

- check: The report gives the test duration with a unit such as seconds or minutes.

### Regression risk callouts (weight 5%)
Flakes or slow tests flagged for follow-up?

- check: The report mentions flaky or slow tests, or states there are none.

## On failure (total below 8.0)

Retry. Regenerate weakest section only. Max 3 attempts.

## Output

```json
{
  "scores": {
    "result_accuracy": 0,
    "failure_detail": 0,
    "coverage_of_changes": 0,
    "command_reproducibility": 0,
    "duration_sanity": 0,
    "regression_risk_callouts": 0
  },
  "weighted_total": 0.0,
  "feedback": [
    "dimension: specific issue with test name or output ref"
  ]
}
```
