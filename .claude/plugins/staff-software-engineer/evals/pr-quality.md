# Eval: PR Quality

Type: LLM-judge
Mode: quality gate
Threshold: weighted total >= 8.0

Score each dimension 0-10. Cite line refs from the PR body when below 7. Weighted total = sum(score x weight%) / 100.

## Rubric

### Title quality (weight 20%)
Conventional Commits prefix correct (`feat`, `fix`, `chore`, etc). Scope present if relevant. <= 70 chars. Concrete, not vague.

### Summary clarity (weight 20%)
Bullets explain what changed and why. Reviewer can grasp the change without opening files. No marketing language.

### Test plan completeness (weight 20%)
Markdown checklist covers the golden path and edge cases. Items are checkable actions, not vague ("test it works").

### Links and refs (weight 15%)
Source plan and dev paths linked. Ticket id (e.g. `PROJ-123`) referenced if branch carried one.

### Risk callouts (weight 15%)
Migration risks, feature flags, rollback plan named when applicable. Marked `none` if truly nothing.

### Draft / readiness signal (weight 10%)
Draft status matches stage of work. If `--ready`, CI gates passed and reviewers assignable. If draft, what's still pending is stated.

## On failure (total below 8.0)

Retry. Regenerate weakest section only. Max 3 attempts.

## Output

```json
{
  "scores": {
    "title_quality": 0,
    "summary_clarity": 0,
    "test_plan_completeness": 0,
    "links_and_refs": 0,
    "risk_callouts": 0,
    "draft_readiness": 0
  },
  "weighted_total": 0.0,
  "feedback": ["dimension: specific issue with body line ref"]
}
```
