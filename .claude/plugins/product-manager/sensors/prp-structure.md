# Sensor: PRP Structure

Type: deterministic
Mode: hard gate

## Required sections (all present, in order)

- Goal
- Why
- What
- Context
- Implementation blueprint
- Validation gates
- Rollout
- Open items
- References

## Forbidden tokens

- lorem
- FIXME
- xxx
- placeholder

## Markdown rules

- exactly 1 H1 heading
- no em-dash
- no ASCII box-drawing

## Required metadata

Document header must declare:
- Source PRD
- Target executor
- Squad
- Tech lead
- Date

## Validation gates block

Validation gates section must include at least one fenced bash or sh code block.

## Sub-sections in Context

Context must contain:
- `### Repos and files touched`
- `### Patterns to follow`

## On failure

Block publish. Return missing sections, missing metadata, missing fenced code blocks. Agent regenerates failed parts only.
