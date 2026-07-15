# Sensor: PRD Structure

Type: deterministic
Execution: computational
Mode: hard gate

## Required sections (all present, in order)

- Problem and Hypothesis
- Customers
- Scope and Non-Goals
- Solution Overview
- Success Metrics
- Rollout
- Risks
- Owners and Open Questions

## Forbidden sections

- Implementation Details
- Code
- API Schema

## Forbidden tokens

- lorem
- TODO
- FIXME
- xxx
- placeholder

## Markdown rules

- exactly 1 H1 heading
- no em-dash
- no ASCII box-drawing

## On failure

Block publish. Return missing sections, forbidden tokens, rule violations. Agent regenerates failed parts only.
