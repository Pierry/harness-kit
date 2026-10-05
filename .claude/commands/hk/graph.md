---
description: Graph engineering mode. off = plain pipeline (default). manifest = REQ ids, trace manifest, scope gate. full = manifest + embedded FalkorDB graph (Graphiti on NVIDIA, Joern CPG).
argument-hint: "[off|manifest|full]"
---

Set graph engineering mode. State in `.claude/hk-config.json`, read by every stage via `python3 .claude/scripts/hk-config.py get graph`.

## No arg

Run `python3 .claude/scripts/hk-config.py get graph` and `python3 .claude/scripts/graph.py status`, show both. Ask which mode (AskUserQuestion): off / manifest / full, one line each from below. Continue.

## `off`

`python3 .claude/scripts/hk-config.py graph off`. Pipeline runs exactly as without graph engineering. Existing `trace/*.yml` stay in git, untouched.

## `manifest`

`python3 .claude/scripts/hk-config.py graph manifest`. No infra, no key. What turns on:
- PRP criteria get stable ids `REQ-001`; `trace/{feature_id}.yml` created from them.
- Plan proposes AFFECTS links with evidence; their files are the only scope dev may touch.
- Dev scope gate blocks any file outside scope (widen with `trace.py scope --add --reason`).
- Every commit hash resolved against git before it is written.
- Test records VERIFIED_BY; next plan settles old links to VALIDATED or STALE.

## `full`

Everything in manifest, plus an embedded FalkorDB graph (no Docker, file at `.claude/runtime/graph/kg.db`, rebuildable from git).
1. `python3 .claude/scripts/graph.py setup`: venv at `~/.cache/harness-kit/graph-venv` with falkordblite + graphiti-core. Needs Python 3.12+.
2. Key for Graphiti: free NVIDIA build key (https://build.nvidia.com, `nvapi-...`). Ask (AskUserQuestion): already in env var (name, default `NVIDIA_API_KEY`) → `hk-config.py graph full --key-env {NAME}`; or user runs `! printf '%s' 'nvapi-...' | python3 .claude/scripts/hk-config.py graph full --key -` (never echo key, warn that pasting in chat lands in transcript). No key → full still works for code + traceability layers, Graphiti off.
3. `python3 .claude/scripts/graph.py index-code` if `joern` present (one-time, minutes on big repos; ask first). Missing joern → code layer skipped, say so.
4. `python3 .claude/scripts/graph.py sync`, then `graph.py status`: relay counts and model catalog check verbatim.

Models (override by env): `HK_GRAPH_LLM_MODEL` default `nvidia/nemotron-3-super-120b-a12b`, `HK_GRAPH_EMBED_MODEL` default `nvidia/nemotron-3-embed-1b` (2048 dim). `status` flags a model NVIDIA retired. Local only, never CI.

## Rules

One writer per layer: Graphiti writes knowledge, `index-code` writes code, `trace.py` writes traceability, `sync` projects it. Models only on unstructured docs (`graph.py ingest`); manifests and CPG load by parser. Full flow: `.claude/shared/graph-engineering.md`.
