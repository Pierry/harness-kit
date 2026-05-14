---
description: Run the project test suite. Reports results to .claude/plugins/staff-software-engineer/outputs/test/.
---

Run the test suite for the current repo.

Print a header card before running and a footer card after the suite finishes. Format: .claude/scripts/stage-card.md.

Detect the project test command (in order):
1. Check README.md or CONTRIBUTING.md for explicit test instructions.
2. Maven (pom.xml present): `./mvnw test` or `mvn test`
3. Gradle (build.gradle present): `./gradlew test`
4. npm (package.json with "test" script): `npm test`
5. pytest (pyproject.toml or pytest.ini): `pytest`
6. Other: ask the user.

Before running, write the phase start marker:

```
.claude/plugins/staff-software-engineer/outputs/.markers/{feature_id}.test.start
```

Run the test command. Capture stdout and stderr.

Save .claude/plugins/staff-software-engineer/outputs/test/{feature_id}.md with:
- command run
- exit code
- passed, failed counts
- failing test names (if any)
- duration

Document gates (run on the saved report):
- Sensor: .claude/plugins/staff-software-engineer/sensors/test-structure.md (auto-run by post-write hook)
- Eval:   .claude/plugins/staff-software-engineer/evals/test-quality.md (you score it; threshold 8.0)

Append approval marker only when exit code is 0 and test-quality eval is >= 8.0:

```
<!-- approved: {YYYY-MM-DD} -->
```

If tests fail, return a blocker with the failing test names and a snippet of the failure output. Do not retry automatically; let the user decide.

Reply with this exact shape:

```
Tests {passed|failed}.
  command:  {detected-test-command}
  passed:   {N}
  failed:   {M}
  duration: {seconds}s
  sensors:  test-structure ok
  eval:     test-quality {N}/10
  output:   {path/to/test/output.md}
  next:     /sse:pr (if passed) | fix failing tests (if failed)
```

If failed, append a `failures:` block listing each failing test name with a one-line snippet from the failure output.
