# Sensor: Design Rigor

Type: deterministic
Execution: inferential
Mode: hard gate

The design must be quantified and trade-off aware, not hand-wavy prose.

## Required signals

- **Numbers present.** Requirements section has a non-functional table with at least 3 numeric
  targets (latency, QPS/throughput, availability, durability, or cost).
- **Back-of-envelope shown.** At least one explicit sizing calculation (QPS, storage, or bandwidth)
  with the arithmetic visible.
- **Assumptions marked.** At least one `ASSUMPTION:` line when scale inputs are estimated.
- **Trade-offs named.** Trade-offs section has at least 3 rows, each with an axis and a chosen side.
- **Failure table.** Consistency and Failure Modes section lists at least 2 failures with mitigation.
- **Phased plan.** Incremental Plan has at least 2 phases, phase 1 is a vertical slice.

## On failure

Block approval. Name the missing signal. Common fix: a claim without a number, an option presented as
the only option (no alternative), or a plan with no vertical slice. Regenerate that section only.
