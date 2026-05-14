# Eval: PRD Readiness

Type: rule-based stage gate
Mode: advisory

Decides whether PRD has enough content for declared stage to advance. Run after prd-quality passes.

## Stage gates

### Team Kickoff

Required:
- problem in 1-2 sentences
- hypothesis with numeric direction
- customer list with at least 1 named segment
- primary success metric named

Word count: 250-600
Next stage: Planning Review

### Planning Review

Inherits Team Kickoff, plus:
- baseline, target, horizon for every metric
- guardrail metrics named
- strategy fit explained
- impact sizing with at least one quantified figure

Word count: 400-900
Next stage: Solution Review

### Solution Review

Inherits Planning Review, plus:
- solution overview with user flow (Mermaid or numbered)
- at least 1 user story (As / I want / so that)
- edge cases documented or explicit none-apply statement
- non-goals listed with reasons
- risk table with at least 2 risks and mitigations
- UX reference or "no UI change"

Word count: 700-1400
Next stage: Launch Readiness

### Launch Readiness

Inherits Solution Review, plus:
- phased rollout table with audience, duration, pass criteria per phase
- kill criteria with numeric thresholds
- owners and reviewers
- open questions resolved or assigned to owner
- feature flag or rollback plan

Word count: 1200-2500
Next stage: Shipped

## Output format

```json
{
  "current_stage": "Team Kickoff | Planning Review | Solution Review | Launch Readiness",
  "ready_for_next": true,
  "missing_for_next": ["item", "item"],
  "warnings": ["soft issue"]
}
```
