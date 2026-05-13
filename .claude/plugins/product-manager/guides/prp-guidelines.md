# PRP Guidelines

A PRP is a PRD plus curated codebase intelligence plus an agent runbook. If the executor has to leave the document to figure out what to do, the PRP is incomplete.

## Three pillars

### Context

Everything the executor needs, included or linked. Specific:
- file paths with line numbers when localized
- existing patterns to mimic, one concrete example each
- external docs scoped to the relevant section
- known gotchas (concurrency, idempotency, retries, timezones)

If the codebase has a similar feature already, point to it. Coding agents do their best work by analogy.

### Implementation detail

Pseudocode or numbered steps concrete enough to translate one-to-one. Include:
- class names, method signatures, return types where decided
- schema changes with the actual migration file or DDL
- endpoint definitions: method, path, request/response shape
- logging, metrics, alert hooks

You do not write the code. You remove every "what should I name this" decision.

### Validation gates

Real commands the executor runs and passes. Vague checks fail.

Bad:
- "Make sure tests pass"

Good:
- `./gradlew :billing-service:test --tests "InvoiceValidator*"`
- `npm --prefix web run typecheck`
- `./gradlew :billing-service:detekt`

Manual gates count, but must be specific:
- [ ] Open `https://staging.example.com/invoices/new` and verify the deadline badge renders for region `EU-WEST`.

## A good PRP

1. Executor reads top-to-bottom, never tabs out except to view linked files.
2. No decisions left for the executor that change scope.
3. Every TODO has an owner.
4. Validation block is copy-pasteable.

## Anti-patterns

- Prose mush where bullets would do
- Restating the PRD instead of linking
- Hidden scope ("also we should refactor X")
- Optimism about state ("there is probably a helper for this already")
- Fabricated file paths or class names

## When to split a PRP

Split if:
- scope crosses two repos with independent deploy cycles
- one PR would exceed ~600 lines
- independent validation gates pass or fail separately

Otherwise keep it one. Context fragmentation costs more than a slightly longer doc.
