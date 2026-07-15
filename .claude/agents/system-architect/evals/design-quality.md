# Eval: Design Quality

Type: LLM-judge
Mode: quality gate
Threshold: weighted total >= 8.0

Score each dimension 0-10. Cite section when scoring below 7. Weighted total = sum(score x weight%) / 100.

## Rubric

### Problem framing (weight 10%)
Frame sharp in 1-2 sentences? Scale and internal-vs-web-scale stated?
- 10: crisp, scale named; 5: present but generic; 0: vague.

### Requirements rigor (weight 15%)
Non-functional targets with real numbers (latency, QPS, availability, consistency)? Back-of-envelope shown?
- 10: numeric targets + sizing math; 5: some numbers, no math; 0: prose only.

### Mental model (weight 10%)
End-to-end flow clear before components? Mermaid present?
- 10: whole path visible; 5: partial; 0: jumps to parts.

### Architecture + deep dives (weight 20%)
Components named with responsibility? 2-3 risk-carrying components deep-dived with data structures and the hard trade-off?
- 10: deep where it matters; 5: components listed, shallow dives; 0: box diagram only.

### Scale, consistency, failure (weight 15%)
Partition strategy avoids hot spots? Consistency model honest? Failure modes enumerated with mitigation? "What breaks first?"
- 10: all three covered concretely; 5: one or two; 0: missing.

### Trade-off discipline (weight 15%)
Each major choice names the alternative and the axis? Coverage/freshness/recall/build-vs-buy tensions explicit?
- 10: trade-offs explicit and reasoned; 5: some stated; 0: choices presented as obvious.

### Pragmatism + incrementalism (weight 10%)
Vertical slice first? Reuses proven engines for treacherous-detail layers? Advanced work last?
- 10: phased, buys what it should; 5: phases thin; 0: big-bang or reinvents everything.

### Canon + voice (weight 5%)
Applies the right lens (DDIA pillars, design-for-failure, immutability) where it sharpens? No banned words, no em-dash, mermaid not ASCII?
- 10: canon used well, clean voice; 5: minor issues; 0: name-drops or fluff.

## On failure (total below 8.0)
Retry. Regenerate lowest-scoring sections only. Max 3 attempts.

## Output format
```json
{
  "scores": {
    "problem_framing": 0,
    "requirements_rigor": 0,
    "mental_model": 0,
    "architecture_deep_dives": 0,
    "scale_consistency_failure": 0,
    "trade_off_discipline": 0,
    "pragmatism_incrementalism": 0,
    "canon_voice": 0
  },
  "weighted_total": 0.0,
  "feedback": [
    "dimension: specific issue with section ref"
  ]
}
```
