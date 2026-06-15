# Marketplace distribution + submission

How harness-kit is distributed as a Claude Code plugin, and how to submit it to Anthropic's official directory.

## What ships

This repo doubles as its own **self-hosted marketplace** and a single **bootstrap plugin**:

- `.claude-plugin/marketplace.json`, catalog (`name: harness-kit`, one plugin entry, `source: "./"`).
- `.claude-plugin/plugin.json`, plugin manifest (`name: harness-kit`, `version: 4.1.0`).
- `skills/install/SKILL.md`, `/harness-kit:install` → runs `setup/install.sh` into the user's project.
- `skills/update/SKILL.md`, `/harness-kit:update` → re-lays the harness.

The plugin is a **bootstrap**, not a native-component plugin: it ships the full harness and installs it into the project, because the agents/commands/guides cross-reference each other by `.claude/`-relative paths that only resolve when copied into a project (not from the plugin cache). This gives full feature parity including hooks and the status bar. See `AGENTS.md` → Distribution.

Validate before publishing:

```bash
claude plugin validate .            # passes
claude plugin validate . --strict   # passes (CI gate)
```

## Self-hosted install (live today, no approval needed)

```
/plugin marketplace add Pierry/harness-kit
/plugin install harness-kit@harness-kit
/harness-kit:install
```

`/plugin marketplace add Pierry/harness-kit` reads `.claude-plugin/marketplace.json` from the default branch. Push changes and users run `/plugin marketplace update`. Because `version` is pinned in `plugin.json`, **bump it every release** or users won't receive updates (commit-SHA versioning only applies when `version` is omitted).

## Official Anthropic directory (optional, gated)

The official, Anthropic-managed directory is **`anthropics/claude-plugins-official`**. Inclusion is at Anthropic's discretion against quality + security standards. It is **not** a PR, submit via the form:

> **Submission form:** https://clau.de/plugin-directory-submission

### Pre-submission checklist

- [x] `.claude-plugin/plugin.json` with `name`, `displayName`, `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`
- [x] `README.md` at repo root documenting what the plugin does and how to install
- [x] `LICENSE` present (MIT)
- [x] `claude plugin validate . --strict` passes
- [ ] `CHANGELOG.md` kept current per release (see file)
- [ ] Repo is public on GitHub at `Pierry/harness-kit`
- [ ] Security note: plugin runs `setup/install.sh`, which **writes into the user's repo** (`.claude/`, `AGENTS.md`, `CLAUDE.md`) and backs up any existing `.claude/settings.json`. Disclose this in the submission, reviewers flag plugins that mutate the project.

### Entry Anthropic would add to their catalog

When approved, their `marketplace.json` would carry an entry like:

```json
{
  "name": "harness-kit",
  "displayName": "Harness Kit",
  "description": "Claude Code harness for product + engineering delivery. From idea to merged PR, one pipeline.",
  "author": { "name": "Space Metrics AI", "email": "pieerry@gmail.com" },
  "category": "workflow",
  "source": { "source": "github", "repo": "Pierry/harness-kit" },
  "homepage": "https://github.com/Pierry/harness-kit",
  "license": "MIT"
}
```

(They fetch from the `github` source; our in-repo `source: "./"` is for the self-hosted marketplace.)

## Third-party directories (no Anthropic gate)

Faster, unofficial discovery while the official review is pending:

- ClaudePluginHub, https://www.claudepluginhub.com/tools/submit-plugin
- claudemarketplaces.com, indexes public marketplace repos
- claudecodecommands.directory/submit, commands/agents indexes

These index a public marketplace repo; no code change needed beyond keeping `.claude-plugin/marketplace.json` valid on the default branch.

## Not a thing: a single cross-AI index

There is no registry that lists one tool into OpenAI + Gemini + Claude at once. Cross-tool reach comes from `AGENTS.md` (read by Codex CLI, Gemini CLI, Cursor on clone): a convention, not a submission target. See `AGENTS.md` → Cross-tool compatibility.
