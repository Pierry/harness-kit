---
name: hk-system-design
description: Design or adversarially review a system with Harness Kit's architecture guides, topic playbooks, sensors, and scored evals. Use for system design docs, architecture reviews, and scale-oriented designs.
---

# Harness Kit system architect

Read `../_shared/compatibility.md` and `.claude/agents/system-architect.md`.

Route the requested action to one command specification:

- Design: `.claude/commands/system-design/design.md`
- Review: `.claude/commands/system-design/review.md`
- Design plus review, or no explicit action: `.claude/commands/system-design/run.md`

Read the selected specification and execute it directly. Use the topic-specific architecture skill
when routing matches one; otherwise use the generic design skill. Preserve sensors, evals, approval
gates, verdict semantics, artifacts, and exact return formats.
