# Sensor: PRP Context Quality

Type: deterministic plus heuristic
Mode: hard gate

A PRP must give an executor enough context to ship without coming back to ask.

## Required sections

- Context
- Implementation blueprint
- What

## Checks within Context

File paths referenced. Repos and files touched table must reference at least 2 real file paths. A file path has `/` and a known extension (java, kt, ts, tsx, js, jsx, vue, py, sql, yaml, yml, md, sh, gradle).

Patterns with concrete examples. Patterns to follow must have at least 1 pattern. Each pattern must include an `Example in codebase:` line pointing to a concrete path.

Known gotchas. Subsection `### Known gotchas` must exist with at least 1 bullet.

External documentation. Subsection `### External documentation` must exist. Either URLs or explicit "none".

## Checks within Implementation blueprint

Numbered steps in a fenced code block.

At least 1 numbered step references a class, file, or command (uppercase or path-shaped token).

## Checks within What

Success criteria must include at least 1 line matching:
- Given / When / Then pattern, or
- measurable comparison (less than, greater than, <, >, =, drops to, stays below)

## Open gaps budget

Count of `NEEDS REVIEW`, `NOT FOUND`, or `TBD` markers must be 5 or fewer.

## On failure

Block publish. Return specific feedback (missing paths, missing examples, etc). Agent regenerates failed parts only.
