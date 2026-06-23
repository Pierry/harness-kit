# Codex compatibility

Harness Kit keeps its canonical workflow specifications under `.claude/commands/` so Claude Code
and Codex execute the same pipeline. When running in Codex, apply these translations:

- A slash command such as `/sse:plan` means: read and execute the matching command specification,
  such as `.claude/commands/sse/plan.md`. Do not ask the user to switch tools or type the slash
  command in Claude Code.
- `Read`, `Grep`, `Write`, `Edit`, and `Bash` mean the equivalent Codex filesystem, search, patch,
  and shell capabilities.
- A Claude `Task` or `Skill` dispatch means: use a matching Codex skill or subagent when available;
  otherwise execute that section directly in the current agent.
- Claude hooks and the status line are conveniences, not prerequisites. Explicitly run every
  marker, sensor, validator, and state script named by the command specification.
- Keep artifacts and state in the existing `.claude/runtime/` paths. This makes an in-progress
  pipeline resumable from either Codex or Claude Code.
- Preserve human approval gates. Do not infer approval merely because a sensor or eval passed.
- Use a plan for multi-stage workflows and keep it synchronized with the active Harness Kit stage.
- Follow the closest `AGENTS.md` and any project-specific conventions before generic Harness Kit
  guidance.

Before executing a workflow, verify that `.claude/commands/` exists. If it does not, tell the user
to select `@harness-kit` and ask it to install, or run `npx @pieerry/harness-kit install`.
