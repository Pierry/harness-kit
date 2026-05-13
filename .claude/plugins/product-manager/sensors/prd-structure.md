# Sensor: PRD Structure

Type: deterministic
Mode: hard gate

## Required sections (all must be present, in order)

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

Block publish. Return list of missing sections, forbidden tokens, rule violations. Agent regenerates only failed parts.
