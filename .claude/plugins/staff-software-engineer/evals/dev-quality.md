# Eval: Dev Quality

Type: LLM-judge
Mode: quality gate
Threshold: weighted total >= 8.0

Score each dimension 0-10. Cite file paths or commit SHAs when below 7. Weighted total = sum(score x weight%) / 100.

## Rubric

### Plan fidelity (weight 25%)
Did the implementation cover every step in the source plan? Any scope creep or missed items?

### Files touched specificity (weight 15%)
Are real, concrete paths listed (not placeholders)? Do they match what the plan named?

### Commit hygiene (weight 20%)
Conventional Commits prefix correct. Small commits (1-4 files, < 100 lines ideal). One concern per commit. Messages explain why, not what.

### Test coverage (weight 20%)
Every new feature/bugfix has matching tests. Edge cases covered. Tests run before commit.

### Convention adherence (weight 10%)
Coding style, framework version, package layout match `coding-style.md` and `conventions/{area}.md`.

### Blocker quality (weight 10%)
If blockers exist, they are specific (file:line, error message). If none, state `none` explicitly.

## On failure (total below 8.0)

Retry. Regenerate weakest section only. Max 3 attempts.

## Output

```json
{
  "scores": {
    "plan_fidelity": 0,
    "files_touched": 0,
    "commit_hygiene": 0,
    "test_coverage": 0,
    "convention_adherence": 0,
    "blocker_quality": 0
  },
  "weighted_total": 0.0,
  "feedback": ["dimension: specific issue with file or sha ref"]
}
```
