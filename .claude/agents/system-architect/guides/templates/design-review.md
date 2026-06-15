# Design Review, {System Name}

<!-- reviews: .claude/runtime/outputs/architect/design/{feature_id}.md -->

> Verdict: {ship | revise | block}. {One-line reason.}

## Summary

What the design does well, in 2-3 bullets. Then the headline concern.

## The staff questions (interrogate each)

| # | Question | Design's answer | Gap / risk |
|---|---|---|---|
| 1 | What is the real unit of quality (record, doc, domain, cluster)? | {...} | {...} |
| 2 | Where does the policy/budget live, how is it updated? | {...} | {...} |
| 3 | How do you stop one tenant/host monopolizing resources? | {...} | {...} |
| 4 | How do you explain why one item is not in the system? | {...} | {...} |
| 5 | What is the freshness/SLA per tier? | {...} | {...} |
| 6 | How do you publish a new version without downtime? | {...} | {...} |
| 7 | What happens when {N}% of inputs fail to parse/process? | {...} | {...} |
| 8 | Which part of the logic is offline vs online? | {...} | {...} |
| 9 | How do you measure result quality beyond latency? | {...} | {...} |
| 10 | Where is the biggest cost-explosion risk? | {...} | {...} |

## Findings

Ordered by severity. Each: what, why it bites, suggested fix.

### Blocker / High / Medium / Low

- **[{severity}]** {finding}. Bites because {...}. Fix: {...}.

## Trade-offs not yet explained

Tensions the design left implicit. Name them.

## Verdict and next steps

- Verdict: {ship | revise | block}.
- Must-fix before build: {...}.

---

<!-- approved: {YYYY-MM-DD} score={weighted-total} verdict={ship|revise|block} -->
