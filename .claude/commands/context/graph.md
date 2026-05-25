---
description: Build queryable knowledge graph of target repo with graphify. Cached per repo, reused across features.
---

Build graphify knowledge graph for a long-lived target repo. Tree-sitter local for code (no API key). Adds semantic edges via LLM for docs/PDFs/images if present (`--with-docs` later, v2).

## Inputs

- Arg 1 (optional): target repo path (default = cwd)
- `--update`: incremental refresh, merge with existing graph (cheap, fast)
- `--deep`: aggressive edge inference (slower, higher fidelity)
- `--wiki`: also build wiki-style markdown index

## Pre-flight

Run `command -v graphify`. Missing → block with install hint:
```
graphify not installed
install: uv tool install graphifyy  |  pipx install graphifyy  |  pip install graphifyy
note:    PyPI pkg is graphifyy (double y), CLI cmd is graphify
docs:    https://github.com/safishamsi/graphify
```

## Steps

1. Bash: `.claude/scripts/graph-repo.sh [target] [--update] [--deep] [--wiki]`
2. Script writes `.claude/runtime/cache/graphify/{repo_slug}/graphify-out/`
3. Outputs `graph.json` (queryable), `graph.html` (interactive), `GRAPH_REPORT.md` (audit)
4. Report cache path + open command for graph.html

## When to use

- Target repo touched by many features (e.g. main product monorepo) — amortize build cost
- Plan stage needs "find all callers of X", "where does Y live" — graph query >> grep
- PRP `## 4) Context → Repos and files touched` discovery
- ~71× token reduction on queries vs raw file reads (per graphify benchmarks)

When NOT to use:
- One-off small repo — overkill
- Hot repo with high commit churn — graph stales fast, use `--update` hook (see Hot-repo section)
- No `graphify` binary in env

## Reply format

```
Graph build complete.
  target:  {target_dir}
  slug:    {repo_slug}
  path:    .claude/runtime/cache/graphify/{slug}/graphify-out/
  view:    open .claude/runtime/cache/graphify/{slug}/graphify-out/graph.html
  report:  .claude/runtime/cache/graphify/{slug}/graphify-out/GRAPH_REPORT.md
  next:    /sse:plan + /sse:sdd will consult graph.json when present
```

## Hot-repo: auto-update hook

For frequently-changing target repos, install graphify's git hook:
```bash
cd {target_repo} && graphify hook install
```
Each commit triggers `graphify . --update`. Graph stays fresh, harness-kit cache reads latest. Document this in target repo's CONTRIBUTING.

## Privacy note

Code-only mode runs Tree-sitter locally — no network calls. Only the optional `--with-docs` step (not enabled by default in this wrapper) sends semantic descriptions of non-code files to a configured LLM. Raw source code never leaves the machine.
