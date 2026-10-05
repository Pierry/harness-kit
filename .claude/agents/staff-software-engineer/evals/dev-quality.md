# Eval: Dev Quality

Type: LLM-judge
Mode: quality gate
Threshold: weighted total >= 8.0

Score each dimension 0-10. Cite file paths or commit SHAs when below 7. Weighted total = sum(score x weight%) / 100.

## Rubric

Checks under each dimension are atomic yes/no tests (`- check:` asked to the judge, `- absent:` a regex run in code). Score a dimension by the share of its checks met; use anchors to break ties. Name failed checks in feedback.

### Plan fidelity (weight 25%)
Did implementation cover every step in source plan? Any scope creep or missed items?

- check: The document states that every step in the source plan was implemented, or names each step that was not.
- check: The document mentions no work outside the source plan, or justifies each extra change.

### Files touched specificity (weight 15%)
Real, concrete paths listed (not placeholders)? Match what plan named?

- check: The document lists the changed files by real path.
- check: The listed file paths contain no placeholders such as `path/to/` or `TODO`.

### Commit hygiene (weight 20%)
Conventional Commits prefix correct. Small commits (1-4 files, < 100 lines ideal). One concern per commit. Messages explain why, not what.

- check: Every commit message listed starts with a Conventional Commits type such as `feat:`, `fix:`, or `chore:`.
- check: Every commit listed covers a single concern.
- check: The commit messages explain why the change was made.

### Test coverage (weight 20%)
Every new feature/bugfix has matching tests. Edge cases covered. Tests run before commit.

- check: Every new feature or bug fix listed has a matching test listed.
- check: The document names edge cases that the tests cover.
- check: The document states that the tests were run before committing.

### Convention adherence (weight 10%)
Coding style, framework version, package layout match `coding-style.md` and `conventions/{area}.md`.

- check: The document states that the code follows the project conventions files, or names each deviation.

### Blocker quality (weight 10%)
If blockers exist, specific (file:line, error message). If none, state `none` explicitly.

- check: The document has a blockers entry that is either `none` or a specific problem.
- check: Every blocker listed names a file and line or quotes an error message.

## On failure (total below 8.0)

Retry. Regenerate weakest section only. Max 3 attempts.

## Output

```json
{
  "scores": {
    "plan_fidelity": 0,
    "files_touched_specificity": 0,
    "commit_hygiene": 0,
    "test_coverage": 0,
    "convention_adherence": 0,
    "blocker_quality": 0
  },
  "weighted_total": 0.0,
  "feedback": [
    "dimension: specific issue with file or sha ref"
  ]
}
```
