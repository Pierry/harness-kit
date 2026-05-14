# PRP Guidelines

PRP = PRD + curated codebase intelligence + agent runbook. If executor leaves document to figure out what to do, PRP incomplete.

## Three pillars

### Context

Everything executor needs, included or linked. Specific:
- file paths with line numbers when localized
- existing patterns to mimic, one concrete example each
- external docs scoped to relevant section
- known gotchas (concurrency, idempotency, retries, timezones)

If codebase has similar feature, point to it. Coding agents work best by analogy.

### Implementation detail

Pseudocode or numbered steps concrete enough to translate one-to-one. Include:
- class names, method signatures, return types where decided
- schema changes with actual migration file or DDL
- endpoint definitions: method, path, request/response shape
- logging, metrics, alert hooks

You do not write code. You remove every "what should I name this" decision.

### Validation gates

Real commands executor runs and passes. Vague checks fail.

Bad:
- "Make sure tests pass"

Good:
- `./gradlew :billing-service:test --tests "InvoiceValidator*"`
- `npm --prefix web run typecheck`
- `./gradlew :billing-service:detekt`

Manual gates count, must be specific:
- [ ] Open `https://staging.example.com/invoices/new` and verify deadline badge renders for region `EU-WEST`.

## Good PRP

1. Executor reads top-to-bottom, never tabs out except to view linked files.
2. No decisions left for executor that change scope.
3. Every TODO has owner.
4. Validation block copy-pasteable.

## Anti-patterns

- Prose mush where bullets would do
- Restating PRD instead of linking
- Hidden scope ("also we should refactor X")
- Optimism about state ("there is probably a helper for this already")
- Fabricated file paths or class names

## When to split PRP

Split if:
- scope crosses two repos with independent deploy cycles
- one PR would exceed ~600 lines
- independent validation gates pass or fail separately

Otherwise keep one. Context fragmentation costs more than slightly longer doc.
