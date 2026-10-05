# Eval: Plan Quality

Type: LLM-judge
Mode: quality gate
Threshold: weighted total >= 8.0

Score each dimension 0-10. Cite line numbers when below 7. Weighted total = sum(score x weight%) / 100.

## Rubric

Checks under each dimension are atomic yes/no tests (`- check:` asked to the judge, `- absent:` a regex run in code). Score a dimension by the share of its checks met; use anchors to break ties. Name failed checks in feedback.

### Scope clarity (weight 20%)
What is being built clear? Tied to source PRP?

- check: The plan states what is being built in one or two sentences.
- check: The plan links to or names the source PRP.

### Files touched specificity (weight 20%)
Files and modules concrete? Real paths, not placeholders?

- check: The plan lists the files or modules to change by real path.
- check: The file paths in the plan contain no placeholders such as `path/to/` or `TODO`.

### Execution flow (weight 20%)
Steps actionable in order? Could fresh engineer follow them?

- check: The plan lists its steps in numbered order.
- check: Every step in the plan is a concrete action an engineer can start on without asking a question.

### Risk awareness (weight 15%)
Real risks called out with mitigations?

- check: The plan names at least one specific technical risk.
- check: Every risk in the plan has a mitigation.

### Rollout (weight 15%)
Phased plan or feature flag strategy?

- check: The plan describes a phased rollout or a feature flag.

### Tests (weight 10%)
Plan names test cases to cover?

- check: The plan names specific test cases to write.

## On failure (total below 8.0)

Retry. Regenerate weakest section only. Max 3 attempts.

## Output

```json
{
  "scores": {
    "scope_clarity": 0,
    "files_touched_specificity": 0,
    "execution_flow": 0,
    "risk_awareness": 0,
    "rollout": 0,
    "tests": 0
  },
  "weighted_total": 0.0,
  "feedback": [
    "dimension: specific issue with line ref"
  ]
}
```
