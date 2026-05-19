# Sensor: Test Structure

Type: deterministic
Mode: hard gate

Validates test report at `.claude/runtime/outputs/sse/test/{feature_id}.md`.

## Required sections

- Command
- Result
- Counts
- Failures
- Duration

## Forbidden tokens

- lorem
- placeholder
- TBD

## Markdown rules

- exactly 1 H1 heading
- no em-dash
- no ASCII box-drawing

## Required metadata

Header must declare:
- Source dev (path to `.claude/runtime/outputs/sse/dev/{feature_id}.md`)
- Framework (maven | gradle | npm | pytest | other)
- Date

## Content rules

- Command must be real shell command (not placeholder).
- Result must be `pass` or `fail`.
- Counts must include numeric `passed` and `failed` values.
- If Result is `fail`, Failures section must list at least 1 failing test name.
- If Result is `pass`, Failures section must be `none`.
- Duration must include unit (s | ms | m).

## On failure

Block publish. Return missing sections and rule violations.
