# Eval: PR Quality

Type: LLM-judge
Mode: quality gate
Threshold: weighted total >= 8.0

Score each dimension 0-10. Cite line refs from PR body when below 7. Weighted total = sum(score x weight%) / 100.

## Rubric

Checks under each dimension are atomic yes/no tests (`- check:` asked to the judge, `- absent:` a regex run in code). Score a dimension by the share of its checks met; use anchors to break ties. Name failed checks in feedback.

### Title quality (weight 20%)
Conventional Commits prefix correct (`feat`, `fix`, `chore`, etc). Scope present if relevant. <= 70 chars. Concrete, not vague.

- check: The PR title starts with a Conventional Commits type such as `feat`, `fix`, or `chore`.
- check: The PR title describes the specific change, not a vague summary like "updates" or "fixes".

### Summary clarity (weight 20%)
Bullets explain what changed and why. Reviewer can grasp change without opening files. No marketing language.

- check: The summary has bullets that say what changed.
- check: The summary says why the change was made.
- check: The summary uses plain language with no marketing claims.

### Test plan completeness (weight 20%)
Markdown checklist covers golden path and edge cases. Items are checkable actions, not vague ("test it works").

- check: The PR has a test plan written as a markdown checklist.
- check: The test plan covers the main success path.
- check: The test plan covers at least one edge case.
- check: Every test plan item is a concrete action someone can check off.

### Links and refs (weight 15%)
Source plan and dev paths linked. Ticket id (e.g. `PROJ-123`) referenced if branch carried one.

- check: The PR links to the source plan or dev report.
- check: The PR references a ticket id, or states there is none.

### Risk callouts (weight 15%)
Migration risks, feature flags, rollback plan named when applicable. Marked `none` if truly nothing.

- check: The PR has a risks section that names migrations, feature flags, or rollback steps, or says `none`.

### Draft / readiness signal (weight 10%)
Draft status matches stage of work. If `--ready`, CI gates passed and reviewers assignable. If draft, what's still pending is stated.

- check: The PR states whether it is a draft or ready for review.
- check: If the PR is a draft, it says what is still pending.

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
    "draft_readiness_signal": 0
  },
  "weighted_total": 0.0,
  "feedback": [
    "dimension: specific issue with body line ref"
  ]
}
```
