---
name: hk-context
description: Build Harness Kit repository context with a Repomix snapshot or Graphify knowledge graph. Use when a large or multi-repo task needs reusable context for planning, implementation, or SDD evals.
---

# Harness Kit context tools

Read `../_shared/compatibility.md` and `.claude/shared/context-strategy.md`.

Route snapshot or pack requests to `.claude/commands/context/pack.md`. Route graph or knowledge
graph requests to `.claude/commands/context/graph.md`. If no mode is explicit, choose the least
expensive tier recommended by the context strategy.

Read the selected command specification and execute it directly. Do not install optional tools
without approval; if a required CLI is absent, return the installation hint from the specification.
