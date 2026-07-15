# Sensor: Design Structure

Type: deterministic
Execution: computational
Mode: hard gate

Applies to a **design** artifact. The review artifact has its own sensor, `review-structure.md`,
because the two share no sections and one file cannot gate both.

## Required sections

- Problem and Context
- Requirements
- End-to-End Mental Model
- High-Level Architecture
- Deep Dives
- Data and Storage
- Scale and Partitioning
- Consistency and Failure Modes
- Observability and Operations
- Security and Compliance
- Incremental Plan
- Trade-offs
- Open Questions and Design Review

## Forbidden tokens

- lorem
- TODO
- FIXME
- xxx
- placeholder
- {System Name}
- {feature_id}
- {N}
- {...}

Unfilled template tokens block. Fill them, or mark `NOT FOUND - NEEDS REVIEW`.

## Markdown rules

- exactly 1 H1 heading
- no em-dash
- no ASCII box-drawing
- at least 2 mermaid blocks (flow + architecture)

## On failure

Block approval. Return missing sections, unfilled tokens, rule violations. Regenerate failed parts
only.
