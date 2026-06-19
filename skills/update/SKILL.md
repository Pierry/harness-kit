---
name: update
description: Re-install / upgrade harness-kit in the current project to the version bundled in the installed plugin. Run after /plugin update harness-kit fetches a newer plugin version.
user_invocable: true
---

Upgrade harness-kit in user's project to version bundled in the installed plugin.

Plugin cache has no git remote, so newest source comes from the **plugin** itself. Order:

1. User runs `/plugin update harness-kit` first (fetches newer plugin from marketplace).
2. This skill re-lays the harness into the project.

## Run

```bash
bash "${CLAUDE_PLUGIN_ROOT}/setup/update.sh" "${CLAUDE_PROJECT_DIR}"
```

`update.sh` in plugin cache (no `.git`) falls through to reinstall of the bundled version, expected. It backs up existing `.claude/settings.json` and reports version delta via `.claude/.hk-version`.

Relay output verbatim. Tell user to **restart Claude Code** after.

If user wants a newer harness and plugin already current, point them at `/plugin update harness-kit` then rerun this.

SessionStart hook (`hk-update-check.sh`) already warns when a newer release is on GitHub, so no manual polling. Notice names both commands (`/plugin update harness-kit` then `/harness-kit:update`). Cache `.claude/.hk-update-check`, disable via `HK_UPDATE_CHECK=0`.
