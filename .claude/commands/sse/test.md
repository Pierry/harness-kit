---
description: Run the project test suite. Reports results to .claude/runtime/outputs/sse/test/.
---

Run test suite for current repo. Follow .claude/agents/staff-software-engineer/guides/pipeline.md for retry, approval, publish, and .claude/shared/pipeline-pattern.md for inputs (resolve-mark-proceed) and eval (adversarial).

Print header card before running and footer card after suite finishes. Format: .claude/scripts/stage-card.md.

Detect project test command (in order):
1. Check README.md or CONTRIBUTING.md for explicit test instructions.
2. Maven (pom.xml present): `./mvnw test` or `mvn test`
3. Gradle (build.gradle present): `./gradlew test`
4. npm (package.json with "test" script): `npm test`
5. pytest (pyproject.toml or pytest.ini): `pytest`
6. Otherwise, infer the runner from the repo: package.json scripts, build files, Makefile targets, CI config (`.github/workflows/`), or project conventions. If it genuinely cannot be inferred, mark `NOT FOUND - NEEDS REVIEW: test runner` in the report and proceed (report it). Do NOT ask the user.

Before running, write phase start marker:

```
.claude/runtime/outputs/sse/.markers/{feature_id}.test-generate.start
```

Run test command. Capture stdout and stderr.

Save .claude/runtime/outputs/sse/test/{feature_id}.md with:
- command run
- exit code
- passed, failed counts
- failing test names (if any)
- duration

Document gates (run on saved report):
- Sensor: .claude/agents/staff-software-engineer/sensors/test-structure.md (auto-run by post-write hook)
- Eval:   .claude/agents/staff-software-engineer/evals/test-quality.md (threshold 8.0)

Run the evals **adversarially**: dispatch a fresh evaluator via the Task tool (`subagent_type: general-purpose`) that did not author this test report. Hand it only the artifact path and the one rubric path; it scores against the rubrics and reports weighted totals plus the low-scoring dimensions. Below threshold (8.0) retries per pipeline.md, regenerating only the flagged dimensions.

Append approval marker only when exit code is 0 and test-quality eval is >= 8.0:

```
<!-- approved: {YYYY-MM-DD} -->
```

Tests fail, return blocker with failing test names and snippet of failure output. Don't retry automatically; let user decide.

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

Failed, append `failures:` block listing each failing test name with one-line snippet from failure output.
