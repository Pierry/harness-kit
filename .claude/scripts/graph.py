#!/usr/bin/env python3
"""
Graph engineering: one interface for the agent, backends behind it.

The agent asks four things and never learns what answers them (Pierry Borges,
"Graph Engineering #1"): related knowledge, affected symbols, related tests,
change history. In `manifest` mode git, grep, semble and the trace/*.yml
manifests answer. In `full` mode an embedded FalkorDB graph answers too:
Graphiti owns the knowledge layer, the Joern CPG owns the code layer, and
trace.py manifests own the traceability layer. One writer per layer; the
database only stores. The graph is a projection: delete it and `sync` plus
`index-code` rebuild it from files in git.

Models only where there is judgment. Manifests and the CPG load through
parsers, never an LLM. Graphiti (LLM extraction) runs only on unstructured
documents passed to `ingest`. Its models default to NVIDIA build (free tier,
OpenAI-compatible): nemotron-3-super-120b-a12b for extraction (valid JSON 4 of 4, 2.5 to
4.6 s, measured 2026-10-05; deepseek-v4.1-flash and glm-5.3-flash timed out at 90 s), nemotron-3-embed-1b for
embeddings. The embedqa models are not used: they require `input_type`, which
OpenAI-compatible clients do not send. NVIDIA retires models without notice
(deepseek-v4-flash-0731 went on 2026-09-21), so `status` checks both ids
against the live catalog; override with HK_GRAPH_LLM_MODEL / HK_GRAPH_EMBED_MODEL.

Usage:
  graph.py knowledge "<text>"           related requirements, decisions, facts
  graph.py symbols "<intent>"           candidate symbols, plus their callers (full)
  graph.py tests <file|file::symbol>    tests linked or calling it
  graph.py history <file>               git log plus every trace link on the file
  graph.py setup                        full mode: create the venv (falkordblite, graphiti)
  graph.py sync                         full mode: project trace/*.yml into the graph
  graph.py index-code [--rebuild]       full mode: Joern CPG -> methods and calls
  graph.py ingest <file> [...]          full mode: Graphiti extraction (calls the LLM)
  graph.py status                       mode, backends, node counts

Exit codes: 0 ok, 2 bad input, 3 needed backend missing (message says what).
"""

import argparse
import asyncio
import collections
import datetime as dt
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, HERE / filename)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


trace = _load("trace", "trace.py")
hk_config = _load("hk_config", "hk-config.py")

VENV = Path(os.environ.get("HK_GRAPH_VENV", Path.home() / ".cache/harness-kit/graph-venv"))
VENV_PY = VENV / "bin/python"
DEPS = ["falkordblite", "graphiti-core[falkordb]", "httpx"]
NVIDIA = "https://integrate.api.nvidia.com/v1"
LLM_MODEL = os.environ.get("HK_GRAPH_LLM_MODEL", "nvidia/nemotron-3-super-120b-a12b")
EMBED_MODEL = os.environ.get("HK_GRAPH_EMBED_MODEL", "nvidia/nemotron-3-embed-1b")
EMBED_DIM = int(os.environ.get("HK_GRAPH_EMBED_DIM", "2048"))
BASE_URL = os.environ.get("HK_GRAPH_BASE_URL", NVIDIA)
GRAPH = "kg"
FRONTENDS = {".java": "javasrc2cpg", ".kt": "kotlin2cpg", ".py": "pysrc2cpg", ".js": "jssrc2cpg",
             ".ts": "jssrc2cpg", ".go": "gosrc2cpg", ".cs": "csharpsrc2cpg", ".php": "php2cpg",
             ".c": "c2cpg", ".cpp": "c2cpg"}
SKIP_DIRS = {".git", "node_modules", "target", "build", "dist", ".venv", "vendor", ".claude"}
TEST_PATH = re.compile(r"(^|/)(tests?|spec|__tests__)(/|$)|(_test|Test|Tests|\.test|\.spec)\.[a-z]+$")


# ---------------------------------------------------------------- shared

def root() -> Path:
    return trace.repo_root()


def mode(r: Path) -> str:
    return hk_config.graph_settings(r)["mode"]


def db_file(r: Path) -> Path:
    p = r / ".claude/runtime/graph/kg.db"
    if not p.parent.exists():
        p.parent.mkdir(parents=True)
        hk_config.ensure_ignored(r, ".claude/runtime/graph/")  # projection, rebuildable, never committed
    return p


def manifests(r: Path) -> list[dict]:
    out = []
    for f in sorted((r / "trace").glob("*.yml")):
        m = trace.yaml_load(f.read_text(encoding="utf-8")) or {}
        m["_file"] = f.name
        out.append(m)
    return out


def tokens(text: str) -> set:
    return {w for w in re.findall(r"[a-z0-9]{3,}", text.lower())}


def overlap(a: str, b: str) -> int:
    return len(tokens(a) & tokens(b))


def in_venv() -> bool:
    try:
        import redislite  # noqa: F401
        return True
    except ImportError:
        return False


def reexec_in_venv() -> None:
    """Full-mode commands need falkordblite and graphiti; run under the graph venv."""
    if in_venv():
        return
    if not VENV_PY.exists():
        sys.exit("[graph] full mode needs its venv. Run: python3 .claude/scripts/graph.py setup")
    os.execv(str(VENV_PY), [str(VENV_PY), __file__, *sys.argv[1:]])


_DB = None


def falkor(r: Path):
    """Embedded FalkorDB, one handle per process, closed (and saved) at exit."""
    global _DB
    if _DB is None:
        import atexit
        from redislite.falkordb_client import FalkorDB
        _DB = FalkorDB(str(db_file(r)))
        atexit.register(_DB.close)
    return _DB.select_graph(GRAPH)


def q(g, cypher: str, **params) -> list:
    return g.query(cypher, params).result_set


def nvidia_key(r: Path) -> str | None:
    s = hk_config.graph_settings(r)
    return hk_config.key_value(r, s["key_env"])


# ---------------------------------------------------------------- the 4 calls

def cmd_knowledge(a, r):
    hits = []
    for m in manifests(r):
        for req in m.get("requirements") or []:
            s = overlap(a.text, req.get("text", ""))
            if s:
                hits.append((s, f"{req['id']} ({m['_file']}): {req['text']}"))
    decisions = r / "context-library/decisions"
    if decisions.is_dir():
        for f in decisions.rglob("*.md"):
            s = overlap(a.text, f.read_text(encoding="utf-8", errors="replace"))
            if s >= 2:
                hits.append((s, f"decision {f.relative_to(r)}"))
    print("# related knowledge")
    for _, line in sorted(hits, reverse=True)[:10]:
        print(line)
    if mode(r) == "full" and in_venv() and nvidia_key(r):
        for fact in asyncio.run(graphiti_search(r, a.text)):
            print(f"fact: {fact}")
    elif not hits:
        print("none found")
    return 0


def semble_candidates(r: Path, text: str) -> list[str]:
    exe = shutil.which("semble")
    if not exe:
        return []
    p = subprocess.run([exe, "search", text, str(r), "--top-k", "8", "--max-snippet-lines", "1"],
                       capture_output=True, text=True, timeout=120)
    try:
        results = json.loads(p.stdout).get("results") or []
    except json.JSONDecodeError:
        return []
    return [f"{x['file_path']}:{x['start_line']}  {x.get('content', '').splitlines()[0][:80]}"
            for x in results if x.get("file_path")]


def cmd_symbols(a, r):
    print("# affected symbols")
    seen = []
    for m in manifests(r):
        reqs = {x["id"]: x.get("text", "") for x in m.get("requirements") or []}
        for l in m.get("links") or []:
            if l["type"] == "AFFECTS" and overlap(a.text, reqs.get(l["from"], "")):
                seen.append(f"{l['to']}  [{l['status']} via {l['from']} in {m['_file']}]")
    for line in dict.fromkeys(seen):
        print(line)
    sem = semble_candidates(r, a.text)
    for line in sem:
        print(f"{line}  [semble]")
    if not seen and not sem:
        print("no candidates; fall back to grep")
    if mode(r) == "full" and in_venv():
        g = falkor(r)
        for line in seen[:5]:
            sym = line.split()[0]
            path, _, name = sym.partition("::")
            leaf = re.split(r"[.#]", name)[-1] if name else ""
            for caller, f in q(g, "MATCH (c:Fn)-[:CALLS]->(t:Fn) WHERE t.file ENDS WITH $f AND t.name = $n "
                                  "RETURN c.fullName, c.file LIMIT 10", f=path, n=leaf):
                print(f"  caller of {sym}: {caller} ({f})  [cpg]")
    return 0


def cmd_tests(a, r):
    target = a.target
    path, _, name = target.partition("::")
    print("# related tests")
    found = []
    for m in manifests(r):
        links = m.get("links") or []
        reqs = {l["from"] for l in links if l["type"] == "AFFECTS" and l["to"].startswith(path)}
        found += [f"{l['to']}  [VERIFIED_BY {l['from']}]" for l in links
                  if l["type"] == "VERIFIED_BY" and l["from"] in reqs]
    if shutil.which("repowise"):
        p = subprocess.run(["repowise", "impacted-tests", path], cwd=r, capture_output=True, text=True,
                           timeout=120)
        found += [f"{l.strip()}  [repowise]" for l in p.stdout.splitlines() if l.strip()][:10]
    if mode(r) == "full" and in_venv():
        leaf = re.split(r"[.#]", name)[-1] if name else ""
        rows = q(falkor(r), "MATCH (c:Fn)-[:CALLS]->(t:Fn) WHERE t.file ENDS WITH $f AND ($n = '' OR t.name = $n) "
                            "RETURN DISTINCT c.fullName, c.file", f=path, n=leaf)
        found += [f"{fn} ({f})  [cpg]" for fn, f in rows if TEST_PATH.search(f or "")]
    for line in dict.fromkeys(found):
        print(line)
    if not found:
        print("none linked; grep test names for the module")
    return 0


def cmd_history(a, r):
    print("# history")
    log = trace.git("log", "--follow", "-n", "10", "--format=%h %ad %s", "--date=short", "--", a.file, cwd=r)
    print(log.stdout.strip() or "no commits")
    for m in manifests(r):
        for l in m.get("links") or []:
            ends = (l.get("to", ""), l.get("from", ""))
            if any(e == a.file or e.startswith(a.file + "::") for e in ends):
                print(f"{m['_file']}: {l['from']} {l['type']} {l['to']} [{l.get('status', l.get('commit'))}]")
    return 0


# ---------------------------------------------------------------- full mode

def cmd_setup(a, r):
    if not VENV_PY.exists():
        py = shutil.which("python3.12") or shutil.which("python3.13") or sys.executable
        subprocess.run([py, "-m", "venv", str(VENV)], check=True)
    subprocess.run([str(VENV_PY), "-m", "pip", "install", "-q", "--upgrade", *DEPS], check=True)
    print(f"[graph] venv ready at {VENV}")
    if not nvidia_key(r):
        print("[graph] no NVIDIA key: Graphiti ingest and knowledge search stay off. "
              "Free key at https://build.nvidia.com, then /hk:graph full")
    return 0


def cmd_sync(a, r):
    """Project trace manifests into the graph. Parser only, no model."""
    g = falkor(r)
    n_links = 0
    for m in manifests(r):
        feature = m.get("feature", m["_file"])
        q(g, "MATCH ()-[e]->() WHERE e.feature = $f DELETE e", f=feature)
        for req in m.get("requirements") or []:
            q(g, "MERGE (x:Requirement {id: $id}) SET x.text = $t, x.feature = $f",
              id=req["id"], t=req.get("text", ""), f=feature)
        for l in m.get("links") or []:
            t = l["type"]
            props = {"feature": feature, "status": l.get("status", ""), "commit": l.get("commit", ""),
                     "recorded": str(l.get("recorded", "")), "confidence": l.get("confidence", 0),
                     "methods": ",".join(l.get("methods") or []),
                     "evidence": json.dumps(l.get("evidence") or {}, ensure_ascii=False)}
            if t == "AFFECTS":
                cy = ("MATCH (a:Requirement {id: $from}) MERGE (b:Method {symbol: $to}) "
                      "SET b.file = $file, b.leaf = $leaf CREATE (a)-[e:AFFECTS]->(b) SET e += $p")
                sym = l["to"]
            elif t == "IMPLEMENTS":
                cy = ("MATCH (b:Requirement {id: $to}) MERGE (a:Method {symbol: $from}) "
                      "SET a.file = $file, a.leaf = $leaf CREATE (a)-[e:IMPLEMENTS]->(b) SET e += $p")
                sym = l["from"]
            elif t == "VERIFIED_BY":
                cy = ("MATCH (a:Requirement {id: $from}) MERGE (b:Test {symbol: $to}) "
                      "SET b.file = $file, b.leaf = $leaf CREATE (a)-[e:VERIFIED_BY]->(b) SET e += $p")
                sym = l["to"]
            else:
                continue
            path, _, name = sym.partition("::")
            q(g, cy, **{"from": l["from"], "to": l["to"], "file": path,
                        "leaf": re.split(r"[.#]", name)[-1] if name else "", "p": props})
            n_links += 1
    print(f"[graph] synced {n_links} links from {len(manifests(r))} manifest(s)")
    return 0


def detect_frontend(r: Path):
    count = collections.Counter()
    for base, dirs, files in os.walk(r):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            ext = os.path.splitext(f)[1]
            if ext in FRONTENDS:
                count[FRONTENDS[ext]] += 1
    return count.most_common(1)[0] if count else (None, 0)


def cmd_index_code(a, r):
    joern = shutil.which("joern")
    if not joern:
        print("[graph] joern not found (https://joern.io); code layer skipped", file=sys.stderr)
        return 3
    home = Path(os.path.realpath(joern)).parent
    cache = r / ".claude/runtime/graph"
    cpg, cg = cache / "cpg.bin", cache / "callgraph.jsonl"
    if a.rebuild or not cpg.exists():
        frontend, n = detect_frontend(r)
        if not frontend:
            print("[graph] no supported source files", file=sys.stderr)
            return 2
        exe = home / "frontends" / frontend / "bin" / frontend
        cmd = [str(exe), str(r), "-o", str(cpg)]
        if frontend == "javasrc2cpg" and any("lombok" in p.read_text(errors="ignore")
                                             for p in r.glob("**/pom.xml")):
            # Without these, javasrc2cpg silently skipped 4,351 of 4,890 Lombok files
            # and still produced a plausible 188 KB graph. Count, do not trust size.
            cmd += ["--fetch-dependencies", "--delombok-mode", "no-delombok"]
        print(f"[graph] {frontend} over {n} files")
        subprocess.run(cmd, check=True, capture_output=True)
    script = HERE.parent / "graph/export_callgraph.sc"
    p = subprocess.run([joern, "--script", str(script), "--param", f"cpgPath={cpg}", "--param", f"out={cg}"],
                       capture_output=True, text=True)
    if "### EXPORTED" not in p.stdout:
        print("[graph] export failed:\n" + (p.stdout + p.stderr)[-800:], file=sys.stderr)
        return 3
    rows = [json.loads(l) for l in cg.read_text(encoding="utf-8").splitlines() if l.strip()]
    g = falkor(r)
    q(g, "MATCH (f:Fn) DETACH DELETE f")
    for i in range(0, len(rows), 500):
        batch = [{"m": x["m"], "n": x["n"], "f": x["f"], "l": x["l"]} for x in rows[i:i + 500]]
        q(g, "UNWIND $rows AS x CREATE (:Fn {fullName: x.m, name: x.n, file: x.f, line: x.l})", rows=batch)
    q(g, "CREATE INDEX FOR (f:Fn) ON (f.fullName)")
    calls = [{"a": x["m"], "b": c} for x in rows for c in x["c"]]
    for i in range(0, len(calls), 1000):
        q(g, "UNWIND $rows AS x MATCH (a:Fn {fullName: x.a}), (b:Fn {fullName: x.b}) CREATE (a)-[:CALLS]->(b)",
          rows=calls[i:i + 1000])
    print(f"[graph] code layer: {len(rows)} methods, {len(calls)} call sites")
    return 0


def graphiti_client(r: Path):
    from graphiti_core import Graphiti
    from graphiti_core.cross_encoder.openai_reranker_client import OpenAIRerankerClient
    from graphiti_core.driver.falkordb_driver import FalkorDriver
    from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
    from graphiti_core.llm_client.config import LLMConfig
    from graphiti_core.llm_client.openai_generic_client import OpenAIGenericClient
    from redislite.async_falkordb_client import AsyncFalkorDB

    key = nvidia_key(r)
    llm_cfg = LLMConfig(api_key=key, model=LLM_MODEL, small_model=LLM_MODEL, base_url=BASE_URL)
    db = AsyncFalkorDB(str(db_file(r)))
    return db, Graphiti(
        graph_driver=FalkorDriver(falkor_db=db, database=GRAPH),
        llm_client=OpenAIGenericClient(config=llm_cfg, structured_output_mode="json_schema"),
        embedder=OpenAIEmbedder(config=OpenAIEmbedderConfig(
            api_key=key, base_url=BASE_URL, embedding_model=EMBED_MODEL, embedding_dim=EMBED_DIM)),
        cross_encoder=OpenAIRerankerClient(config=llm_cfg),
    )


def group_id(r: Path) -> str:
    # FalkorDriver uses group_id as the graph name. Keep Graphiti in the same
    # graph as the code and trace layers: one database, layers by label.
    return GRAPH


async def close_async(db) -> None:
    # redislite's async client shuts the embedded server down without awaiting
    # the save, so writes vanish at exit. Persist explicitly first.
    try:
        await db.connection.execute_command("SAVE")
    finally:
        await db.close()


async def graphiti_search(r: Path, text: str) -> list[str]:
    from graphiti_core.search.search_config_recipes import NODE_HYBRID_SEARCH_RRF
    db, g = graphiti_client(r)
    try:
        facts = [e.fact for e in await g.search(text, group_ids=[group_id(r)], num_results=5)]
        nodes = await g.search_(text, config=NODE_HYBRID_SEARCH_RRF, group_ids=[group_id(r)])
        return facts + [f"{n.name}: {n.summary}" for n in nodes.nodes[:5] if n.summary]
    finally:
        await g.close()
        await close_async(db)


async def graphiti_ingest(r: Path, files: list[Path]) -> int:
    db, g = graphiti_client(r)
    try:
        await g.build_indices_and_constraints()
        for f in files:
            await g.add_episode(name=f.name, episode_body=f.read_text(encoding="utf-8"),
                                source_description=f"document {f.relative_to(r) if f.is_relative_to(r) else f}",
                                reference_time=dt.datetime.now(dt.timezone.utc), group_id=group_id(r))
            print(f"[graph] ingested {f.name}")
        return 0
    finally:
        await g.close()
        await close_async(db)


def cmd_ingest(a, r):
    if not nvidia_key(r):
        print("[graph] no NVIDIA key; Graphiti ingest needs one (https://build.nvidia.com)", file=sys.stderr)
        return 3
    files = [Path(f).resolve() for f in a.files]
    structured = [f for f in files if f.suffix in (".json", ".yml", ".yaml")]
    if structured:
        # Already typed: a parser knows the answer, a model would only invent.
        print(f"[graph] skipping structured files, use trace.py/sync instead: {[f.name for f in structured]}",
              file=sys.stderr)
    return asyncio.run(graphiti_ingest(r, [f for f in files if f not in structured]))


def live_models(key: str) -> set:
    import urllib.request
    req = urllib.request.Request(f"{BASE_URL}/models", headers={"Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return {m["id"] for m in json.loads(resp.read()).get("data", [])}


def cmd_status(a, r):
    s = hk_config.graph_settings(r)
    key = nvidia_key(r)
    if s["mode"] == "full" and key:
        try:
            ids = live_models(key)
            for role, model in (("llm", LLM_MODEL), ("embed", EMBED_MODEL)):
                print(f"{role} {model}: {'live' if model in ids else 'NOT IN CATALOG, set HK_GRAPH_' + role.upper() + '_MODEL'}")
        except OSError as e:
            print(f"model catalog unreachable: {e}")
    print(f"mode={s['mode']} venv={'yes' if VENV_PY.exists() else 'no'} "
          f"nvidia_key={'set' if nvidia_key(r) else 'missing'} joern={'yes' if shutil.which('joern') else 'no'} "
          f"semble={'yes' if shutil.which('semble') else 'no'} manifests={len(manifests(r))}")
    if s["mode"] == "full" and in_venv() and db_file(r).exists():
        g = falkor(r)
        for label in ("Requirement", "Method", "Test", "Fn", "Entity"):
            print(f"  {label}: {q(g, f'MATCH (n:{label}) RETURN count(n)')[0][0]}")
    return 0


FULL_ONLY = {"sync", "index-code", "ingest"}


def main() -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("knowledge").add_argument("text")
    sub.add_parser("symbols").add_argument("text")
    sub.add_parser("tests").add_argument("target")
    sub.add_parser("history").add_argument("file")
    sub.add_parser("setup")
    sub.add_parser("sync")
    sub.add_parser("index-code").add_argument("--rebuild", action="store_true")
    sub.add_parser("ingest").add_argument("files", nargs="+")
    sub.add_parser("status")
    a = ap.parse_args()
    r = root()
    if a.cmd in FULL_ONLY:
        if mode(r) != "full":
            print(f"[graph] `{a.cmd}` needs graph mode full (/hk:graph full)", file=sys.stderr)
            return 3
        reexec_in_venv()
    elif a.cmd in ("knowledge", "symbols", "tests", "status") and mode(r) == "full" and VENV_PY.exists():
        reexec_in_venv()
    return {"knowledge": cmd_knowledge, "symbols": cmd_symbols, "tests": cmd_tests, "history": cmd_history,
            "setup": cmd_setup, "sync": cmd_sync, "index-code": cmd_index_code, "ingest": cmd_ingest,
            "status": cmd_status}[a.cmd.replace("_", "-")](a, r)


if __name__ == "__main__":
    sys.exit(main())
