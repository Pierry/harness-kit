# Eval: Plan Quality

Type: LLM-judge
Mode: quality gate
Threshold: weighted total >= 8.0

Score each dimension 0-10. Cite line numbers when below 7. Weighted total = sum(score x weight%) / 100.

## Rubric

### Scope clarity (weight 20%)
What is being built clear? Tied to source PRP?

### Files touched specificity (weight 20%)
Files and modules concrete? Real paths, not placeholders?

### Execution flow (weight 20%)
Steps actionable in order? Could fresh engineer follow them?

### Risk awareness (weight 15%)
Real risks called out with mitigations?

### Rollout (weight 15%)
Phased plan or feature flag strategy?

### Tests (weight 10%)
Plan names test cases to cover?

## On failure (total below 8.0)

Retry. Regenerate weakest section only. Max 3 attempts.

## Output

```json
{
  "scores": {
    "scope_clarity": 0,
    "files_touched": 0,
    "execution_flow": 0,
    "risk_awareness": 0,
    "rollout": 0,
    "tests": 0
  },
  "weighted_total": 0.0,
  "feedback": ["dimension: specific issue with line ref"]
}
```
