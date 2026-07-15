# Sensor: PRP Has Acceptance Criteria

Type: structural
Execution: inferential
Mode: hard gate

`/sse:sdd` uses PRP as load-bearing spec. Goal-loop predicate built from PRP. PRP missing testable criteria → predicate undefined → loop cannot judge done. Block early.

## Check

Source PRP must contain both:

1. **Success criteria (verifiable):** bullet list under section `## 3) What`. Each bullet must be testable (observable behavior, output, or measurable state). Vague bullets (e.g. "works well", "user-friendly") fail.

2. **Validation gates** section `## 6) Validation gates` with non-empty bash block. Empty fenced block or placeholder `{commands the executor MUST run}` fails.

## Pass conditions

- `Success criteria (verifiable):` literal string present
- At least 1 bullet under it (line starts with `- ` or `* `)
- No bullet contains placeholder `{` `}` braces
- `## 6) Validation gates` present
- Bash fence under it contains at least 1 non-comment, non-placeholder command

## On failure

Block. Return blocker pointing at missing/weak section. Tell user to run `/product-manager:prp` and address feedback before retrying `/sse:sdd`.

## Example failure output

```
prp-has-acceptance-criteria: FAIL
  file: .claude/runtime/outputs/pm/prp/{feature_id}.md
  reason: section "Success criteria (verifiable)" empty
  fix:    add 2-4 testable bullets under section 3
```
