# Context Strategy

Shared guide for PM + SSE agents. When pulling target-repo context into a stage, pick the right tier.

Three tiers. Cost goes up left → right. Capability goes up too. Match tier to need.

| Tier | Tool | When | Cost | Freshness |
|---|---|---|---|---|
| 1 | `grep` / `Read` | small repo, narrow question, one-shot | free | always live |
| 2 | `repomix` snapshot | feature-scoped context, deterministic handoff | low (one pack per feature) | frozen at pack time |
| 3 | `graphify` graph | long-lived repo, queryable, multi-feature reuse | medium upfront (one build per repo), tiny per query | merged via `--update` per commit (with hook) |

## Decision tree

```
question = "where does X live?" or "what calls Y?"
  ├── repo <20 files? ──── grep / Read
  ├── graph cached + repo unchanged? ── query graph.json
  ├── graph stale or missing + repo big? ── /context:graph (one shot)
  └── feature-scoped narrow scope? ──── /context:pack --include "..."

question = "give me the full repo for an independent eval"
  ├── repo packs under 200k tokens? ── /context:pack
  └── too big? ── /context:pack --include "{narrowed glob}"

question = "supervisor eval reads diff + minimal context (SDD loop)"
  ├── pack of {changed files} ∪ {PRP files touched} → /context:pack --include
  └── add graph query for impact analysis (v2)
```

## Per-stage hookup

### `/product-manager:prp`
- § 4 Context discovery: prefer graph query (if cached) over grep
- `Repos and files touched` list: graph + grep both OK; graph faster
- No pack here — PRP is upstream of pack

### `/sse:plan`
- Read order:
  1. source PRP
  2. cached graph at `.claude/runtime/cache/graphify/{slug}/graphify-out/graph.json` if present
  3. cached pack at `.claude/runtime/cache/repomix/{feature_id}.{ext}` if present
  4. fall back to grep + Read on target repo
- Don't double-load. If pack covers all PRP-listed files, skip grep.

### `/sse:dev`
- Never reads stale pack/graph for the live code — code is mutating per commit.
- Reads plan only. Use grep/Read on live repo for guidance lookups.

### `/sse:test`
- No context tools. Runs detected test command.

### `/sse:sdd` supervisor eval
- Fresh session reads:
  1. PRP (full)
  2. dev summary
  3. test report
  4. `git diff main...HEAD`
- If pack exists: ALSO read `cache/repomix/{feature_id}.{ext}` for richer judgment
- If graph exists: ALSO query graph for "does diff break callers of touched symbols"

## Cache layout

```
.claude/runtime/cache/
├── repomix/
│   ├── .gitkeep
│   └── {feature_id}.xml             ephemeral, per-feature, cleared on /pipeline:reset
└── graphify/
    ├── .gitkeep
    └── {repo_slug}/                 long-lived, per-repo, manual rebuild or --update hook
        └── graphify-out/
            ├── graph.json
            ├── graph.html
            └── GRAPH_REPORT.md
```

`{repo_slug}` = `basename(abs_target)` + `-` + `shasum(abs_target)[:8]`. Stable across machines for same path.

## Invalidation

| Cache | Invalidated by |
|---|---|
| `repomix/{feature_id}.*` | `/pipeline:reset`, manual `rm`, or stage detecting target diff > 100 LOC since pack |
| `graphify/{slug}/` | manual `/context:graph --update`, graphify git-hook auto-commit refresh, or manual `rm -rf` |

## Cost notes

- **Repomix**: ~1-2s build for medium repo. Token count printed. Fits inside context.
- **Graphify code-only**: Tree-sitter local, ~5-30s for medium repo, no API key, no network.
- **Graphify --with-docs**: LLM semantic extraction on docs/PDFs/images. Sends semantic descriptions only (not raw code). Requires API key per their docs. Opt-in only; this harness defaults to code-only.

## Install

Both optional. Detect on `hk install`; print install hint if missing. Don't auto-install.

```
repomix:   npm i -g repomix   |   brew install repomix
graphify:  uv tool install graphifyy   |   pipx install graphifyy
```

PyPI package name is `graphifyy` (double y), CLI command is `graphify`.
