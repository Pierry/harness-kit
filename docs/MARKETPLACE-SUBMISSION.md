# Marketplace distribution + submission

How harness-kit is distributed through the Codex and Claude Code marketplaces, plus the optional
Anthropic directory submission.

## What ships

This repo doubles as its own **self-hosted marketplace** for both runtimes and a single bootstrap
plugin implementation:

- `.agents/plugins/marketplace.json`, Codex catalog (`harness-kit@harness-kit`, source `./`).
- `.codex-plugin/plugin.json`, Codex plugin manifest.
- `.claude-plugin/marketplace.json`, Claude Code catalog (source `./`).
- `.claude-plugin/plugin.json`, Claude Code plugin manifest.
- `skills/install/SKILL.md`, cross-runtime bootstrap that runs `setup/install.sh`.
- `skills/update/SKILL.md`, cross-runtime updater that re-lays the harness.

The plugin is a **bootstrap**, not a native-component plugin: it ships the full harness and installs it into the project, because the agents/commands/guides cross-reference each other by `.claude/`-relative paths that only resolve when copied into a project (not from the plugin cache). This gives full feature parity including hooks and the status bar. See `AGENTS.md` → Distribution.

Validate before publishing:

```bash
TEST_CODEX_HOME=$(mktemp -d)
CODEX_HOME="$TEST_CODEX_HOME" codex plugin marketplace add . --json
CODEX_HOME="$TEST_CODEX_HOME" codex plugin add harness-kit@harness-kit --json
claude plugin validate .            # passes
claude plugin validate . --strict   # passes (CI gate)
```

## Self-hosted Codex install

```bash
codex plugin marketplace add Pierry/harness-kit
codex plugin add harness-kit@harness-kit
```

Start a new thread in the target repo, select `@harness-kit`, and ask it to install. The bootstrap
copies the repo-scoped `$hk-*` skills and shared runtime into the project. The marketplace command
reads `.agents/plugins/marketplace.json` from the default branch.

Update with:

```bash
codex plugin marketplace upgrade harness-kit
codex plugin add harness-kit@harness-kit
```

Then start a new thread and run `$hk-update` once per installed repo.

## Self-hosted Claude Code install

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
- [ ] Security note: plugin runs `setup/install.sh`, which **writes into the user's repo** (`.claude/`, `AGENTS.md`, `CLAUDE.md`) and backs up any existing `.claude/settings.json`. The written `settings.json` pre-authorizes only the harness's own committed scripts (`marker.sh`, `preflight.sh`, `run-sensors.sh`) plus `git`/`gh`/`jq` and the project build tools; destructive ops (`rm -rf`, force push, `git reset --hard`) are explicitly denied. Disclose this in the submission, reviewers flag plugins that mutate the project or grant Bash permissions.

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

## Two catalogs, one repository

Codex and Claude Code use separate marketplace manifests, but both catalogs point to the same
repository root and bootstrap installer. `AGENTS.md` remains the portable fallback for Gemini CLI,
Cursor, and other tools that do not consume either plugin format. See `AGENTS.md` → Cross-tool
compatibility.
