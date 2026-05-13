# Sensor: Code Conventions

Type: deterministic (via project-specific tooling)
Mode: hard gate

Run lint and format checks for the area being touched.

## Backend (Java/Kotlin)

Detect via build file:
- Maven: `mvn -q checkstyle:check` or `mvn -q spotless:check` if configured
- Gradle: `./gradlew detekt` or `./gradlew checkstyleMain`

If no linter is configured, skip and emit a warning.

## Web (Vue/JS)

- `npm run lint` if defined
- `npm run typecheck` or `tsc --noEmit` if TS

## Mobile

- iOS: `swiftlint`
- Android: `./gradlew ktlintCheck` or `./gradlew detekt`

## DevOps

- `terraform fmt -check -recursive`
- `yamllint` for workflows

## On failure

Block. Surface the linter output. Agent fixes and re-runs.

## On warning (no linter configured)

Note in the output, do not block. Suggest adding the linter to the repo.
