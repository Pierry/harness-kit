# Sensor: Test Coverage

Type: heuristic
Execution: inferential
Mode: hard gate

Every feature or bugfix must include tests for changed code.

## Check

For each changed source file in dev commit set, look for:
- corresponding test file (e.g., `Foo.java` -> `FooTest.java`, `bar.ts` -> `bar.test.ts`)
- OR test file modified in same commit exercising the change

Patterns recognized:
- `**/test/**`, `**/tests/**`, `**/__tests__/**`, `**/spec/**`, `**/specs/**`
- File suffix: `Test`, `Tests`, `.test.`, `.spec.`, `_test.`, `_spec.`

## Exclusions

Following do not need test in same commit:
- README and docs
- migration files (V*.sql)
- pure config (yaml, json)
- generated code

## On failure

Block. List source files without tests. Agent adds missing tests.
