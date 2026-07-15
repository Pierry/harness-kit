# Sensor: Plan Structure

Type: deterministic
Execution: computational
Mode: hard gate

## Required sections

- Scope
- Repos and files touched
- Execution flow
- Risks
- Rollout
- Tests

## Forbidden tokens

- lorem
- TODO without ticket reference
- placeholder

## Markdown rules

- exactly 1 H1 heading
- no em-dash
- no ASCII box-drawing

## Required metadata

Header must declare:
- Source PRP
- Squad
- Tech lead
- Date

## On failure

Block publish. Return missing sections and rule violations. Agent regenerates failed parts only.
