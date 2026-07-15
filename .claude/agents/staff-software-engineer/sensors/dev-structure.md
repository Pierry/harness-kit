# Sensor: Dev Structure

Type: deterministic
Execution: computational
Mode: hard gate

Validates dev summary doc at `.claude/runtime/outputs/sse/dev/{feature_id}.md`.

## Required sections

- Summary
- Files changed
- Commits
- Sensors
- Blockers

## Forbidden tokens

- lorem
- TODO without ticket reference
- placeholder
- XXX
- FIXME without ticket reference

## Markdown rules

- exactly 1 H1 heading
- no em-dash
- no ASCII box-drawing

## Required metadata

Header must declare:
- Source plan (path to `.claude/runtime/outputs/sse/plan/{feature_id}.md`)
- Branch
- Area (backend | web | mobile | devops)
- Date

## Content rules

- Files changed must list at least 1 real file path (not placeholder).
- Commits section must list at least 1 short SHA (7+ hex chars).
- Sensors section must report `code-conventions` and `test-coverage` outcomes (ok | failed).

## On failure

Block publish. Return missing sections and rule violations. Agent regenerates failed parts only.
