# Sensor: Code Maintainability

Type: deterministic
Execution: computational
Mode: warn-then-gate

Runs the target repo's own quality tooling against the working tree. Dispatched by `run-sensors.sh`
to `.claude/runtime/scripts/staff-software-engineer/maintainability.sh`, not to `sensor-runner.py`,
because it executes tools instead of parsing markdown.

This exists because of Böckeler, [Maintainability sensors for coding
agents](https://martinfowler.com/articles/sensors-for-coding-agents.html): an agent reliably ignores
a sensor unless it is hardwired, and markdown guides alone are "quite unreliable". Its sibling
`code-conventions.md` is inferential on purpose, it carries judgment a script cannot. This one
carries the part a script can.

## What it runs

Whatever the repo actually configures, never an imposed config:

- npm `lint` and `typecheck` scripts
- ruff or flake8, when Python config is present
- gradle `ktlintCheck`, maven `checkstyle:check`, when configured
- `gitleaks detect`, when installed

## Outcomes

- **pass**, every configured tool passed.
- **fail**, a configured tool failed. Fix and retry, max 3 attempts per `guides/pipeline.md`.
- **not checked** (exit 4), the repo configures no tooling this sensor knows. Never reported as a
  pass. Nothing ran, so nothing is known.

## The gap this measures

Most repos fail this on day one, which is the finding, not a defect. Complexity, file-length and
function-length limits are not in ESLint's default preset, and cross-file analysis (dependency rules,
coupling) is more underused still. An agent generates code faster than a human reviews it, so the
limits that used to be nice-to-have are now the only thing reading every line.

## On failure

Return the failing tool and its output verbatim. Do not rewrite the tool's config to make it pass.
