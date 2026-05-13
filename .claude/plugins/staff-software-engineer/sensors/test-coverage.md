# Sensor: Test Coverage

Type: heuristic
Mode: hard gate

Every feature or bugfix must include tests for the changed code.

## Check

For each changed source file in the dev commit set, look for:
- a corresponding test file (e.g., `Foo.java` -> `FooTest.java`, `bar.ts` -> `bar.test.ts`)
- OR a test file modified in the same commit that exercises the change

Patterns recognized:
- `**/test/**`, `**/tests/**`, `**/__tests__/**`, `**/spec/**`, `**/specs/**`
- File suffix: `Test`, `Tests`, `.test.`, `.spec.`, `_test.`, `_spec.`

## Exclusions

The following do not need a test in the same commit:
- README and docs
- migration files (V*.sql)
- pure config (yaml, json)
- generated code

## On failure

Block. List the source files without tests. Agent adds the missing tests.
