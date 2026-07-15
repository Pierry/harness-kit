# Sensor: PR Structure

Type: deterministic
Execution: computational
Mode: hard gate

Validates PR record at `.claude/runtime/outputs/sse/pr/{feature_id}.md`.

## Required sections

- URL
- Title
- Draft
- Summary
- Test plan
- Refs

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
- Source plan (path to `.claude/runtime/outputs/sse/plan/{feature_id}.md`)
- Source dev (path to `.claude/runtime/outputs/sse/dev/{feature_id}.md`)
- Branch
- Date

## Content rules

- URL must match `https://github.com/{owner}/{repo}/pull/{number}` shape.
- Title must start with Conventional Commits prefix (`feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `build`, `ci`, `style`, `revert`) followed by optional scope and `:`.
- Title length <= 70 chars.
- Draft must be `yes` or `no`.
- Summary must have at least 1 bullet.
- Test plan must be markdown checklist with at least 1 item.
- Refs section must reference both source plan and source dev paths.

## On failure

Block publish. Return missing sections and rule violations.
