# Eval: PRP Quality

Type: LLM-judge
Mode: quality gate
Threshold: weighted total >= 8.0

Read as if you are the executor: would you hit a dead end? Score 0-10 per dimension. Cite line numbers when below 7. Weighted total = sum(score x weight%) / 100.

## Rubric

### Goal clarity (weight 15%)
One paragraph, concrete, tied to source PRD?

- 10: unambiguous
- 5: clear but loose scope
- 0: "improve X" with no scope

### Context completeness (weight 20%)
Context section gives file paths, patterns with examples, external docs, gotchas? Executor never needs to leave?

- 10: self-contained
- 5: most context present, some gaps
- 0: "go look at the repo"

### Implementation concreteness (weight 20%)
Blueprint specific enough that executor never decides naming, file location, or API shape?

- 10: numbered steps with concrete identifiers
- 5: outline present, some decisions open
- 0: prose handwaving

### Validation executability (weight 15%)
Validation gates are real commands executor copy-pastes? Manual checks specific?

- 10: copy-paste ready
- 5: commands with placeholders
- 0: "make sure it works"

### Pattern referencing (weight 10%)
Codebase patterns named with file:line references?

- 10: at least 2 concrete patterns
- 5: 1 pattern
- 0: no analogies

### Scope discipline (weight 10%)
"Out of scope" explicit? One feature, no bundled unrelated work?

- 10: tight
- 5: 1 unrelated item slipped in
- 0: scope creep

### Gap honesty (weight 5%)
Unknowns marked with NEEDS REVIEW or TBD with owners? Marker count <= 5?

- 10: honest, low marker count
- 5: markers without owners
- 0: too many gaps or pretends to know

### Voice (weight 5%)
No banned words. No em-dashes. Mermaid not ASCII.

- 10: clean
- 5: 1-2 violations
- 0: 3+ violations

## On failure (total below 8.0)

Retry. Identify lowest-scoring dimensions, regenerate those sections only. Max 3 attempts.

## Output format

```json
{
  "scores": {
    "goal_clarity": 0,
    "context_completeness": 0,
    "implementation_concreteness": 0,
    "validation_executability": 0,
    "pattern_referencing": 0,
    "scope_discipline": 0,
    "gap_honesty": 0,
    "voice": 0
  },
  "weighted_total": 0.0,
  "feedback": ["dimension: specific issue with line ref"]
}
```
