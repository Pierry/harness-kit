# Eval: Design Review Depth

Type: LLM-judge
Mode: quality gate
Threshold: weighted total >= 8.0

Judge whether the review interrogates, not summarizes. Score 0-10, cite the design section.

## Rubric

Checks under each dimension are atomic yes/no tests (`- check:` asked to the judge, `- absent:` a regex run in code). Score a dimension by the share of its checks met; use anchors to break ties. Name failed checks in feedback.

### Question coverage (weight 25%)
All 10 staff questions answered with the design's actual answer and a named gap?

- check: The review answers each of the ten staff questions.
- check: Every staff question answer names a gap or states that there is none.
- 10: all 10, concrete; 5: half, or generic; 0: skipped.

### Severity calibration (weight 20%)
Findings ordered by severity, tags justified? Blocker is truly blocking, not nitpick?

- check: The findings are ordered from most to least severe.
- check: Every finding tagged as a blocker describes something that would stop the design from working.
- 10: calibrated; 5: flat or mislabeled; 0: unordered.

### Specificity (weight 25%)
Each finding cites the section, names the failure, proposes a concrete fix? No vague "consider improving"?

- check: Every finding names the section of the design it refers to.
- check: Every finding describes a specific failure.
- check: Every finding proposes a concrete fix.
- 10: specific + fix; 5: located but soft fix; 0: generic advice.

### Cost and failure focus (weight 15%)
Surfaces the biggest cost-explosion risk and the first thing that breaks at 10x?

- check: The review names the largest cost risk.
- check: The review names the first component that breaks at ten times the load.
- 10: both named; 5: one; 0: neither.

### Skepticism + trade-off catch (weight 15%)
Default skeptical? Catches trade-offs the design left implicit?

- check: The review challenges at least one claim the design makes.
- check: The review names a trade-off the design left implicit.
- 10: adversarial, catches hidden trade-offs; 5: mild; 0: rubber stamp.

## On failure (total below 8.0)
Retry. Deepen the weakest dimension. Max 3 attempts. A review that rubber-stamps fails by design.

## Output format
```json
{
  "scores": {
    "question_coverage": 0,
    "severity_calibration": 0,
    "specificity": 0,
    "cost_and_failure_focus": 0,
    "skepticism_trade_off_catch": 0
  },
  "weighted_total": 0.0,
  "verdict": "ship|revise|block",
  "feedback": [
    "dimension: specific issue with section ref"
  ]
}
```
