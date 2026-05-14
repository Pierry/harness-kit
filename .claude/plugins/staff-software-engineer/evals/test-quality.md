# Eval: Test Quality

Type: LLM-judge
Mode: quality gate
Threshold: weighted total >= 8.0

Score each dimension 0-10. Cite test names or output lines when below 7. Weighted total = sum(score x weight%) / 100.

## Rubric

### Result accuracy (weight 25%)
Does the Result field (pass | fail) match the exit code and counts? No misreporting.

### Failure detail (weight 25%)
If failures occurred, are failing test names listed with enough context (file:line, assertion message)? If pass, is Failures explicitly `none`?

### Coverage of changes (weight 20%)
Do the tests run cover the files changed in the dev phase? Are gaps called out?

### Command reproducibility (weight 15%)
Is the Command field a real shell command another engineer could run as-is? Includes filters or args if used.

### Duration sanity (weight 10%)
Is the duration reported with a unit? Is it plausible for the suite size?

### Regression risk callouts (weight 5%)
Are flakes or slow tests flagged for follow-up?

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
    "regression_risk": 0
  },
  "weighted_total": 0.0,
  "feedback": ["dimension: specific issue with test name or output ref"]
}
```
