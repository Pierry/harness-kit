---
name: hk-update
description: Update an installed Harness Kit repository from the current Codex plugin or package source while preserving runtime artifacts. Use when a newer Harness Kit version is available.
---

# Update Harness Kit

Resolve the plugin root from this `SKILL.md` location by walking up to the directory containing
`setup/update.sh`, then run:

```bash
bash <plugin-root>/setup/update.sh <target-repository-root>
```

If no plugin source root is available, use
`npx @pieerry/harness-kit@latest update <target-repository-root>` after obtaining approval for
network access.

Relay version and backup output. After updating, tell Codex users to start a new thread and Claude
Code users to restart so changed skills, instructions, commands, and hooks reload.
