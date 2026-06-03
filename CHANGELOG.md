# Changelog

All notable changes to harness-kit. Format roughly follows [Keep a Changelog](https://keepachangelog.com); versions follow [SemVer](https://semver.org).

## [4.1.0]

### Added
- **Claude Code marketplace distribution.** `.claude-plugin/marketplace.json` + `.claude-plugin/plugin.json` make this repo a self-hosted marketplace and bootstrap plugin. Install with `/plugin marketplace add Pierry/harness-kit` → `/plugin install harness-kit@harness-kit` → `/harness-kit:install`.
- `/harness-kit:install` and `/harness-kit:update` skills — bootstrap the full harness into a project via `setup/install.sh` / `update.sh`.
- `docs/MARKETPLACE-SUBMISSION.md` — distribution + official-directory submission guide.
- `AGENTS.md` → Cross-tool compatibility section: what Codex CLI / Gemini CLI / Cursor consume vs Claude-Code-only components.

### Notes
- The marketplace plugin is a **bootstrap** (installs the harness into the project) rather than running components from the plugin cache, because harness assets cross-reference each other by `.claude/`-relative paths. This preserves full feature parity, including hooks and the status bar.
- `version` is pinned in `plugin.json`; bump it on every release so marketplace users receive updates.

## [4.1.0] — prior

- SDD loop (`/sse:sdd`) + optional context tools (repomix `/context:pack`, graphify `/context:graph`).

## [4.0.x]

- AGENTS.md migration: end-to-end tests, docs, demo. Installer symlink fix + Getting started docs.
