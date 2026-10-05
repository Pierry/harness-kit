# Context Strategy

Shared guide for PM, SSE, architect agents. Pull target-repo context with best tool present. All tools optional. Missing tool → next row, never block.

## Probe once per stage

```
.claude/scripts/context-tools.sh {target_repo}
```

Prints yes/no per CLI + skill. MCP servers invisible to shell: check own tool list for `mcp__semble__*`, `mcp__repowise__*`, `mcp__context7__*`. MCP preferred over CLI when both present.

## Pick by question

| Question | First choice | Fallback |
|---|---|---|
| where is X implemented, by intent | semble: `mcp__semble__search` or `semble search "<intent>" {repo} --top-k 10` | Grep + Read |
| similar code to copy pattern from | semble: `mcp__semble__find_related` or `semble find-related {file} {line} {repo}` | Grep for sibling names |
| what is this module, why shaped so | repowise: `get_context` / `get_answer` MCP, or `repowise context {path}`, `repowise why {path}` | Read README + git log |
| risk of touching these files | `repowise risk` (MCP `get_risk`) | git log churn on files |
| which tests cover changed files | `repowise impacted-tests` | grep test names for module |
| who calls X, blast radius | cpg skill (joern, needs `cpg.bin`) or graphify graph | Grep callers |
| library / framework API, versions | context7: `mcp__context7__resolve-library-id` then `query-docs` | WebFetch official docs |
| whole feature scope as one snapshot | repomix `/context:pack` | Read files listed in PRP |
| what was decided before | memoria skill (if installed) | `context-library/decisions/` |
| break requirements into verifiable units | atomize skill (if installed) → `atoms.json` validated | hand-written criteria |

Semble rule: one focused query, go to returned file:line, read that symbol only. No re-grep same content. Grep only for every literal occurrence (rename, all callers by name).

Graph engineering on (`hk-config.py get graph` not off): prefer the 4 calls in `.claude/shared/graph-engineering.md` (`graph.py knowledge|symbols|tests|history`), they wrap the rows above plus trace manifests and, in full mode, the graph.

## Per stage

### `/product-manager:prd`
- memoria: prior decisions on same problem → cite in Evidence or Risks.
- atomize (if present): decompose problem + hypothesis into atoms; feed Success Metrics. Keep `atoms.json` next to PRD: `.claude/runtime/outputs/pm/prd/{feature_id}.atoms.json`.

### `/product-manager:prp`
- semble search per PRD capability → `Repos and files touched` with file:line.
- semble find-related on best match → Context patterns with file:line (rubric `pattern_referencing`).
- repowise context/why on touched modules → gotchas.
- context7 for every external lib named → Context external docs links (rubric check: links external docs).
- atomize (if present): PRD atoms → `Success criteria (verifiable)`, one criterion per atom.

### `/sse:plan`
- Read PRP, then semble on PRP files for current shape, repowise risk on files touched → Risks section with score (rubric `risk_awareness`).
- context7 for any API whose version matters.
- cached pack/graph if present; don't double-load files they cover.

### `/sse:dev`
- Live code mutates per commit: never trust stale pack/graph. semble index refreshes on its own; fine to use.
- semble find-related before writing a new file: match nearest sibling conventions.
- context7 for exact API syntax instead of memory.

### `/sse:test`
- `repowise impacted-tests` on changed files → report which tests cover change, name uncovered files (rubric `coverage_of_changes`).

### `/sse:sdd` supervisor + `spec-satisfied`
- Fresh session reads PRP, dev summary, test report, `git diff {base}...HEAD`.
- repowise risk on diff, cpg or graphify for callers of touched symbols → "does diff break callers".
- pack if present for surrounding code.

### `/system-design:design`
- Existing system: semble + repowise context to ground current architecture before proposing. Greenfield: skip.

## Cache layout (repomix, graphify)

```
.claude/runtime/cache/
├── repomix/{feature_id}.xml         ephemeral, cleared on /pipeline:reset
└── graphify/{repo_slug}/graphify-out/graph.json   long-lived, manual rebuild
```

`{repo_slug}` = `basename(abs_target)` + `-` + `shasum(abs_target)[:8]`. Semble, repowise, cpg keep own caches (`~/.cache/semble`, `{repo}/.repowise/`, `{repo}/cpg.bin`).

## Invalidation

| Cache | Invalidated by |
|---|---|
| `repomix/{feature_id}.*` | `/pipeline:reset`, or target diff > 100 LOC since pack |
| `graphify/{slug}/` | `/context:graph --update` or manual `rm -rf` |
| repowise | `repowise update` (hook keeps it synced when installed) |
| `cpg.bin` | rebuild by hand; takes minutes, ask user first |

## Install hints (never auto-install)

```
semble:   pip install 'semble[mcp]'   |   uvx --from 'semble[mcp]' semble
repowise: uv tool install repowise && repowise init {repo}
context7: MCP server, https://github.com/upstash/context7
repomix:  npm i -g repomix
graphify: uv tool install graphifyy
rtk:      brew install rtk && rtk init -g
joern:    https://joern.io  (cpg.bin per repo)
```

No tool here needs a paid API key in default mode. repowise `generate` and graphify `--with-docs` call LLMs: opt-in only, never in CI.
