# Sensor: PRP Context Quality

Type: deterministic plus heuristic
Mode: hard gate

PRP must give executor enough context to ship without coming back to ask.

## Required sections

- Context
- Implementation blueprint
- What

## Checks within Context

File paths referenced. Repos and files touched table must reference at least 2 real file paths. File path has `/` and known extension (java, kt, ts, tsx, js, jsx, vue, py, sql, yaml, yml, md, sh, gradle).

Patterns with concrete examples. Patterns to follow needs at least 1 pattern. Each pattern must include `Example in codebase:` line pointing to concrete path.

Known gotchas. Subsection `### Known gotchas` must exist with at least 1 bullet.

External documentation. Subsection `### External documentation` must exist. Either URLs or explicit "none".

## Checks within Implementation blueprint

Numbered steps in fenced code block.

At least 1 numbered step references class, file, or command (uppercase or path-shaped token).

## Checks within What

Success criteria must include at least 1 line matching:
- Given / When / Then pattern, or
- measurable comparison (less than, greater than, <, >, =, drops to, stays below)

## Open gaps budget

`NEEDS REVIEW`, `NOT FOUND`, or `TBD` marker count must be 5 or fewer.

## On failure

Block publish. Return specific feedback (missing paths, missing examples, etc). Agent regenerates failed parts only.
