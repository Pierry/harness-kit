---
name: hk-sse
description: "Run Harness Kit engineering stages: plan, develop, test, open or monitor a PR, spec-driven development, local pipeline, or Firebase publish. Use when implementing an approved PRP or continuing engineering delivery."
---

# Harness Kit staff software engineer

Read `../_shared/compatibility.md` and `.claude/agents/staff-software-engineer.md`.

Route the requested action to `.claude/commands/sse/<action>.md`. Supported actions are `plan`,
`dev`, `test`, `pr`, `pr-monitor`, `run`, `sdd`, and `firebase-publish`. Use `run` when the user asks
for the full engineering pipeline and does not name a narrower stage.

Read the selected command specification and execute it directly. When it references another slash
command, open and execute that command's markdown file. Preserve all preflight checks, conventions,
sensors, evals, retries, approval gates, and return formats. Pass through `--local`, `--sdd`, and
`--no-monitor` intent from the user's prompt.
