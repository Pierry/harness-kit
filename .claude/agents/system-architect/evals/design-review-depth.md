# Eval: Design Review Depth

Type: LLM-judge
Mode: quality gate
Threshold: weighted total >= 8.0

Judge whether the review interrogates, not summarizes. Score 0-10, cite the design section.

## Rubric

### Question coverage (weight 25%)
All 10 staff questions answered with the design's actual answer and a named gap?
- 10: all 10, concrete; 5: half, or generic; 0: skipped.

### Severity calibration (weight 20%)
Findings ordered by severity, tags justified? Blocker is truly blocking, not nitpick?
- 10: calibrated; 5: flat or mislabeled; 0: unordered.

### Specificity (weight 25%)
Each finding cites the section, names the failure, proposes a concrete fix? No vague "consider improving"?
- 10: specific + fix; 5: located but soft fix; 0: generic advice.

### Cost and failure focus (weight 15%)
Surfaces the biggest cost-explosion risk and the first thing that breaks at 10x?
- 10: both named; 5: one; 0: neither.

### Skepticism + trade-off catch (weight 15%)
Default skeptical? Catches trade-offs the design left implicit?
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
    "cost_failure_focus": 0,
    "skepticism_tradeoff_catch": 0
  },
  "weighted_total": 0.0,
  "verdict": "ship|revise|block",
  "feedback": ["dimension: specific issue with section ref"]
}
```
