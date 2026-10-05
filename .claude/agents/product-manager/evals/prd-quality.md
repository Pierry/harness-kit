# Eval: PRD Quality

Type: LLM-judge
Mode: quality gate
Threshold: weighted total >= 8.0

Score each dimension 0-10. Cite line numbers when scoring below 7. Weighted total = sum(score x weight%) / 100.

## Rubric

Checks under each dimension are atomic yes/no tests (`- check:` asked to the judge, `- absent:` a regex run in code). Score a dimension by the share of its checks met; use anchors to break ties. Name failed checks in feedback.

### Clarity (weight 20%)
Problem stated in 1-2 sentences? Names who suffers, how often, what it costs?

- check: `sections.problem_and_hypothesis` states the problem in one or two sentences.
- check: `sections.problem_and_hypothesis` names who is affected by the problem.
- check: `sections.problem_and_hypothesis` says how often the problem happens or how many people it affects.
- check: `sections.problem_and_hypothesis` says what the problem costs, in money, time, or another measurable unit.

- 10: crisp, specific, evidence-backed
- 5: present but generic
- 0: missing or vague

### Hypothesis (weight 15%)
"If we X, then Y will Z, because W" hypothesis with numeric target?

- check: `sections.problem_and_hypothesis` contains a hypothesis that names a change and the outcome it should cause.
- check: The hypothesis in `sections.problem_and_hypothesis` gives a numeric target for the outcome.
- check: The hypothesis in `sections.problem_and_hypothesis` explains why the change should cause the outcome.

- 10: falsifiable, numeric, evidence-tied
- 5: directional but missing target or evidence
- 0: aspirational, no measurable claim

### Customer specificity (weight 10%)
Real customers named with reasons each matters?

- check: `sections.customers` names specific customers, accounts, or segments, not just "users".
- check: `sections.customers` gives a reason why each named customer or segment matters.

- 10: concrete, differentiated
- 5: segments named but thin
- 0: "users" with no segmentation

### Metric completeness (weight 20%)
Every metric has baseline, target, horizon? Guardrails listed? Kill criteria numeric?

- check: Every metric in `sections.success_metrics` has a baseline value.
- check: Every metric in `sections.success_metrics` has a target value.
- check: Every metric in `sections.success_metrics` has a date or time horizon for its target.
- check: `sections.success_metrics` names at least one guardrail metric that must not get worse.
- check: `sections.success_metrics` states a kill criterion with a numeric threshold.

- 10: all filled, guardrails present, kill criteria with thresholds
- 5: targets present but missing horizon or guardrails
- 0: missing fields or vague targets

### Scope discipline (weight 10%)
Non-goals listed (1-3) with reasons? Trade-offs explicit?

- check: `sections.scope_and_non_goals` lists at least one non-goal.
- check: Every non-goal in `sections.scope_and_non_goals` gives a reason it is out of scope.
- check: `sections.scope_and_non_goals` names a trade-off the team is choosing to accept.

- 10: scope tight, trade-offs named
- 5: non-goals present, reasons thin
- 0: no non-goals

### Rollout realism (weight 10%)
Phased rollout with audience, duration, pass criteria per phase? Rollback plan?

- check: `sections.rollout` splits the launch into more than one phase.
- check: Every phase in `sections.rollout` names who gets access in that phase.
- check: Every phase in `sections.rollout` has a criterion that must pass before the next phase starts.
- check: `sections.rollout` explains how to roll back.

- 10: phased with gates and rollback
- 5: phases present, criteria vague
- 0: "ship it" with no plan

### Evidence (weight 10%)
Claims backed by quotes, ticket counts, dashboard data, research?

- check: The document quotes a customer or user directly.
- check: The document cites a number taken from tickets, a dashboard, or analytics.
- check: The document cites research, an interview, or another named source.

- 10: at least 3 grounded pieces
- 5: 1-2 grounded
- 0: unsupported assertions

### Voice (weight 5%)
No banned words. No em-dashes. Mermaid not ASCII.

- absent: (?i)\b(delve|leverage|utilize|unlock|streamline|robust|cutting-edge|seamless|best-in-class)\b
- absent: —
- absent: (?m)^\s*\+[-=]{3,}\+

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
