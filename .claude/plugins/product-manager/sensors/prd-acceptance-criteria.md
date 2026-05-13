# Sensor: PRD Acceptance Criteria

Type: deterministic
Mode: hard gate

## Required sections

- Solution Overview
- Success Metrics
- Rollout

## Markdown rules

- exactly 1 H1 heading
- no em-dash

## Checks

User story format. Every bullet in Solution Overview that starts with "As a" must follow:

```
- As a {persona}, I want {action}, so that {benefit}.
```

Metric completeness. Success Metrics table: every row must have non-empty Baseline, Target, Horizon. Cells with only "TBD", "N/A", "?", or empty fail.

Guardrails block. A "Guardrails" line must exist in Success Metrics.

Kill criteria. A "Kill criteria:" line must exist in Success Metrics and contain at least one digit.

Rollout phases. Rollout table needs at least 2 rows.

Non-goals listed. Scope and Non-Goals must have a Non-goals subsection with 1-3 bullets.

Open gaps budget. Count of `NOT FOUND` markers must be 5 or fewer.

## On failure

Block publish. Surface each violation with line number. Agent regenerates affected sections only.
