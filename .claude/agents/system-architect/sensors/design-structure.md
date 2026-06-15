# Sensor: Design Structure

Type: deterministic
Mode: hard gate

## Design doc, required sections (all present, in order)

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

## Review doc, required (when sensor runs on a review artifact)

- all 10 staff questions answered (table rows non-empty)
- Findings section with at least 1 finding and a severity tag
- Verdict present: ship | revise | block

## Forbidden tokens

lorem, TODO, FIXME, xxx, placeholder, {System Name}, {feature_id}, {N}, {...}

(Unfilled template tokens block. Fill or mark `NOT FOUND - NEEDS REVIEW`.)

## Markdown rules

- exactly 1 H1 heading
- no em-dash
- no ASCII box-drawing
- at least 2 mermaid blocks in a design doc (flow + architecture)

## On failure

Block approval. Return missing sections, unfilled tokens, rule violations. Regenerate failed parts
only.
