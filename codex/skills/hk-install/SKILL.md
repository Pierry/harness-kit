---
name: hk-install
description: Install Harness Kit into the current repository for Codex and Claude Code. Use after adding the Harness Kit plugin or when `.agents/skills` and `.claude` workflow assets are missing.
---

# Install Harness Kit

Resolve the plugin root from this `SKILL.md` location by walking up to the directory containing
`setup/install.sh`. Run:

```bash
bash <plugin-root>/setup/install.sh <target-repository-root>
```

If this is a repo-scoped copy and no plugin root is available, use
`npx @pieerry/harness-kit@latest install <target-repository-root>` after obtaining approval for
network access.

This writes shared workflow assets to `.claude/`, Codex entry skills to `.agents/skills/`, and root
instructions to `AGENTS.md` (plus `CLAUDE.md` when absent). Tell the user before running because the
installer modifies the target repository and backs up an existing `.claude/settings.json`.

After installation, tell Codex users to start a new thread so repo skills and `AGENTS.md` reload.
Mention `$hk-golden-path`, `$hk-product-manager`, `$hk-sse`, `$hk-system-design`, `$hk-pipeline`, and
`$hk-context`. Claude Code users can restart and use the existing slash commands.
