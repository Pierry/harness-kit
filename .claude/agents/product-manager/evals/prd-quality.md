# Eval: PRD Quality

Type: LLM-judge
Mode: quality gate
Threshold: weighted total >= 8.0

Score each dimension 0-10. Cite line numbers when scoring below 7. Weighted total = sum(score x weight%) / 100.

## Rubric

### Clarity (weight 20%)
Problem stated in 1-2 sentences? Names who suffers, how often, what it costs?

- 10: crisp, specific, evidence-backed
- 5: present but generic
- 0: missing or vague

### Hypothesis (weight 15%)
"If we X, then Y will Z, because W" hypothesis with numeric target?

- 10: falsifiable, numeric, evidence-tied
- 5: directional but missing target or evidence
- 0: aspirational, no measurable claim

### Customer specificity (weight 10%)
Real customers named with reasons each matters?

- 10: concrete, differentiated
- 5: segments named but thin
- 0: "users" with no segmentation

### Metric completeness (weight 20%)
Every metric has baseline, target, horizon? Guardrails listed? Kill criteria numeric?

- 10: all filled, guardrails present, kill criteria with thresholds
- 5: targets present but missing horizon or guardrails
- 0: missing fields or vague targets

### Scope discipline (weight 10%)
Non-goals listed (1-3) with reasons? Trade-offs explicit?

- 10: scope tight, trade-offs named
- 5: non-goals present, reasons thin
- 0: no non-goals

### Rollout realism (weight 10%)
Phased rollout with audience, duration, pass criteria per phase? Rollback plan?

- 10: phased with gates and rollback
- 5: phases present, criteria vague
- 0: "ship it" with no plan

### Evidence (weight 10%)
Claims backed by quotes, ticket counts, dashboard data, research?

- 10: at least 3 grounded pieces
- 5: 1-2 grounded
- 0: unsupported assertions

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
    "clarity": 0,
    "hypothesis": 0,
    "customer_specificity": 0,
    "metric_completeness": 0,
    "scope_discipline": 0,
    "rollout_realism": 0,
    "evidence": 0,
    "voice": 0
  },
  "weighted_total": 0.0,
  "feedback": ["dimension: specific issue with line ref"]
}
```
