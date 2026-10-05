# Graph Engineering

Shared guide, PM + SSE. Source: Pierry Borges, "Graph Engineering #1". Stop agent guessing: requirement ids + map of decisions, code, links between them. Cut guessing, bound blast radius, make it auditable.

## Gate every block on mode

```
python3 .claude/scripts/hk-config.py get graph     # graph=off|manifest|full
```

`off` → skip every graph block below. Pipeline unchanged. Default.

## Layers, one writer each

| Layer | Writer | Lives in |
|---|---|---|
| traceability | `.claude/scripts/trace.py` only | `trace/{feature_id}.yml`, committed with PR |
| knowledge (full) | Graphiti via `graph.py ingest` | embedded FalkorDB `.claude/runtime/graph/kg.db` |
| code (full) | Joern CPG via `graph.py index-code` | same graph, label `Fn`, edge `CALLS` |
| projection (full) | `graph.py sync` from manifests | same graph, `Requirement`/`Method`/`Test` |

Manifest file = truth. Graph = projection. Lost graph → `sync` + `index-code` rebuild. Never hand-edit a manifest; go through `trace.py` so ontology + commit checks run. Ontology: `.claude/graph/ontology.yml` (project override `{repo}/.claude/graph/ontology.yml`).

## Agent interface (4 calls, backend hidden)

```
python3 .claude/scripts/graph.py knowledge "<text>"     related REQs, decisions, Graphiti facts
python3 .claude/scripts/graph.py symbols "<intent>"     past links + semble + CPG callers
python3 .claude/scripts/graph.py tests <file[::sym]>     VERIFIED_BY + repowise + CPG test callers
python3 .claude/scripts/graph.py history <file>          git log + every trace link on file
```

manifest mode: answers from manifests, git, semble, repowise. full: adds graph. Same commands both.

## Link statuses

PROPOSED: analysis thinks REQ touches symbol. VALIDATED: merged + a VERIFIED_BY test. STALE: symbol gone or moved. Every link carries methods, evidence, commit (resolved in git at write; nonexistent hash = write refused), date.

## Per stage

### `/product-manager:prp`
Success criteria lines: `- [ ] REQ-001: {verifiable criterion}`, ids stable, never renumber. atomize present → atom ids instead, keep `atoms.json`. Then `trace.py init {feature_id} --prp {prp} | --atoms {atoms.json}`.

### `/sse:plan`
1. `trace.py settle --all` first: earlier features' links become VALIDATED/STALE; include changed manifests in this branch.
2. Per REQ: `graph.py knowledge "<req text>"`, `graph.py symbols "<req text>"`. Pick symbols with evidence. Each → `trace.py propose {feature_id} --req REQ-00N --symbol path::Symbol --method semble --method cpg_callers --evidence semble="..." --confidence 0.N`.
3. Files touched section = `trace.py scope {feature_id}`. Nothing outside it. New files the plan creates: `trace.py scope --add {file} --reason "new file for REQ-00N"`.
4. Risks: callers from `graph.py symbols` (full) = blast radius; name them.

### `/sse:dev`
- Before each commit, nothing to do. After each commit touching a scoped symbol: `trace.py implement {feature_id} --req REQ-00N --symbol path::Symbol --commit HEAD --evidence diff="..."`.
- Needed file outside scope → stop, `trace.py scope --add {file} --reason "..."` with real reason, mention in dev summary. Never silent.
- Hard gate before dev summary: `trace.py gate {feature_id}`. Exit 1 = dev fails, list files. Computational, not inferential.

### `/sse:test`
Test proving a REQ → `trace.py verify {feature_id} --req REQ-00N --test path::test_name --commit HEAD`. REQ with no test → name it under Coverage gaps. `graph.py tests` to find existing ones.

### `/sse:pr`
`trace.py validate` must exit 0. Commit `trace/{feature_id}.yml`. Paste `trace.py summary {feature_id}` into PR body under Traceability.

### full mode extras
- Plan start: `graph.py sync` (cheap). `graph.py index-code` only when code layer older than last merge or missing; reindex = rebuild today, minutes on big repos, ask first.
- PRD or decision docs (unstructured) → `graph.py ingest {file}` (LLM, NVIDIA). Never ingest manifests or atoms.json: parser already knows.

## Cost

manifest: zero infra, zero keys, ms per call. full: embedded DB, Joern build once per repo (15 min on 4,900 Java files in source post), Graphiti only on new docs. Never send whole graph to model: graph narrows context, never fills it.
