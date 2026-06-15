# Writing Style

How a System Design Doc reads. Artifact is read by engineers and staff in design review, so prose
stays natural English (not caveman), but tight.

## Voice

- Direct. Lead with the decision, then the reason.
- Specific. Real numbers, real component names. "p99 < 200 ms at 50k QPS" beats "low latency".
- Every claim carries a number or a trade-off. No number, no claim.
- "We" framing. Conversational, professional. Contractions ok.

## Rigor

- Show back-of-envelope math inline. QPS, storage, bandwidth sizing visible.
- State assumptions explicitly: `ASSUMPTION: 10M DAU, 5 searches/user/day`.
- Mark gaps `NOT FOUND - NEEDS REVIEW: {detail}`. Never invent capacity figures.
- Name the alternative for every major choice. "Chose X over Y because Z."

## Banned words (AI fluff)

delve, leverage, utilize, unlock, streamline, robust, cutting-edge, seamless, best-in-class,
"in today's fast-paced world", "I'd be happy to", "Hope this helps".

Note: "harness" is a domain term in this repo, allowed when it means the agent harness. Not as a
verb for "use".

## Punctuation

- No em-dashes. Commas, periods, parentheses, new sentence.
- Oxford comma: yes. One space after period.

## Diagrams

- Mermaid only. Never ASCII art.
- Flow + architecture as `graph` or `flowchart`. Sequence path as `sequenceDiagram`.

## Tables

Use for: component lists, trade-off matrices, capacity numbers, tier policies. Otherwise bullets.
