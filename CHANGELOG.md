# Changelog

All notable changes to harness-kit. Format roughly follows [Keep a Changelog](https://keepachangelog.com); versions follow [SemVer](https://semver.org).

## [4.2.0]

### Added
- **`system-architect` agent.** A third orchestrator that turns a problem into a rigorous System Design Doc, then runs an adversarial staff-level design review. Built on the same harness shape: guides (feedforward) + sensors + evals (feedback). Commands `/system-design:design`, `/system-design:review`, `/system-design:run`.
- **Per-system-design topic skills.** Like the SSE agent picks an area skill, system-architect picks a topic playbook: `url-shortener`, `rate-limiter`, `search-engine` (from the System Design series), plus a generic `design` fallback and a `review` skill.
- **Design method, sensors, evals.** `guides/design-method.md` (the method + the engineering canon: Kleppmann/DDIA, Jeff Dean, Vogels, Helland, Nygard, Ousterhout), `sensors/design-structure` and `design-rigor` (deterministic), `evals/design-quality` and `design-review-depth` (LLM-judge).
- **GitHub wiki.** Full theory and references for the harness (harness engineering, guides, sensors, evals, pipeline, golden path, agents) and for each system design playbook.

### Changed
- `setup/install.sh` now installs the `system-architect` agent and the `system-design` command namespace, and scaffolds `runtime/outputs/architect/{design,review}`.
- Registered the new agent and routes in `AGENTS.md` and `CLAUDE.md`.

## [4.1.0]

### Added
- **Claude Code marketplace distribution.** `.claude-plugin/marketplace.json` + `.claude-plugin/plugin.json` make this repo a self-hosted marketplace and bootstrap plugin. Install with `/plugin marketplace add Pierry/harness-kit` → `/plugin install harness-kit@harness-kit` → `/harness-kit:install`.
- `/harness-kit:install` and `/harness-kit:update` skills, bootstrap the full harness into a project via `setup/install.sh` / `update.sh`.
- `docs/MARKETPLACE-SUBMISSION.md`, distribution + official-directory submission guide.
- `AGENTS.md` → Cross-tool compatibility section: what Codex CLI / Gemini CLI / Cursor consume vs Claude-Code-only components.

### Notes
- The marketplace plugin is a **bootstrap** (installs the harness into the project) rather than running components from the plugin cache, because harness assets cross-reference each other by `.claude/`-relative paths. This preserves full feature parity, including hooks and the status bar.
- `version` is pinned in `plugin.json`; bump it on every release so marketplace users receive updates.

## [4.1.0], prior

- SDD loop (`/sse:sdd`) + optional context tools (repomix `/context:pack`, graphify `/context:graph`).

## [4.0.x]

- AGENTS.md migration: end-to-end tests, docs, demo. Installer symlink fix + Getting started docs.
