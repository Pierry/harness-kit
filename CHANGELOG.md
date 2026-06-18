# Changelog

All notable changes to harness-kit. Format roughly follows [Keep a Changelog](https://keepachangelog.com); versions follow [SemVer](https://semver.org).

## [4.4.0]

### Added
- New SSE command `/sse:firebase-publish`: create or reuse a Firebase project, configure Hosting, and deploy the current static site. Stages to a preview channel first, then promotes. Hard safety rules baked in: never deletes any resource, creates at most one project per run and verifies via `projects:list`, confirms PROJECT_ID before create. Post-pipeline deploy step for static web work, registered in AGENTS.md routing and the SSE agent README.
- Version bumped to 4.4.0 across VERSION, plugin.json, package.json, and the README badge so marketplace consumers receive the update.

## [4.3.1]

### Changed
- Designer skill typography hardened: **never use em-dashes (`—`) or en-dashes (`–`)** in user-facing copy, headings, labels, microcopy, code comments, commits, PRs, or docs (all three locales). Use comma, colon, parentheses, or rewrite; plain hyphen for compounds stays fine.
- Designer skill iconography reinforced: in place of any emoji, **use Material Design 3 (Material Symbols) icons or another modern open set** (Lucide, Phosphor). Need a glyph, reach for an MD3/modern icon, never an emoji.
- Version bumped to 4.3.1 across VERSION, plugin.json, package.json, and the README badge so marketplace consumers receive the update.

## [4.3.0]

### Changed
- Designer skill iconography hardened: **never use emojis** (anywhere, UI/icons/buttons/copy), **always create original, modern SVG icons** (consistent grid, one visual language, currentColor, accessible labels). Use a single modern open set only as a base; brand and hero marks stay original; never mix icon families.
- Version bumped to 4.3.0 across VERSION, plugin.json, package.json, and the README badge so marketplace consumers receive the update.

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
