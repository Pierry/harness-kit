# Sensor: Review Structure

Type: deterministic
Execution: computational
Mode: hard gate

Applies to a **review** artifact, the output of `/system-design:review`. Sections track
`guides/templates/design-review.md`. Split out of `design-structure.md`, which gates the design
artifact and shares none of these sections.

## Required sections

- Summary
- The staff questions
- Findings
- Trade-offs not yet explained
- Verdict and next steps

## Required tokens

- Verdict:

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

## Markdown rules

- exactly 1 H1 heading
- no em-dash
- no ASCII box-drawing

## On failure

Block approval. Name the missing section or the unfilled token. A review with no verdict is not a
review. Regenerate the failed part only.
