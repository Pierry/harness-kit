#!/usr/bin/env python3
"""
Traceability layer: the one writer for trace/{feature_id}.yml.

Graph engineering, day one (Pierry Borges, "Graph Engineering #1"): before the
agent edits, every requirement gets a stable id, every code symbol a change
might touch becomes a link with its evidence, and the list of those symbols is
the only scope the agent may touch. After the merge, links with a test become
VALIDATED and links whose symbol moved become STALE, so the next feature reads
what this one left behind. No database: the manifest in git is the truth, a
graph (graph.py, full mode) is a projection rebuilt from it.

Links live in trace/{feature_id}.yml at the target repo root and ship with the
PR. Edge types, required fields and statuses come from .claude/graph/ontology.yml.
A commit field is resolved against git on write; a hash that names no object
fails the write. That is the check fabricated provenance never had to pass.

Usage:
  trace.py init FEATURE --prp PRP.md | --atoms atoms.json
  trace.py propose FEATURE --req REQ-001 --symbol path/File.java::Class.method
                   --method semble [--method repowise_risk] --evidence semble="..."
                   --confidence 0.7
  trace.py scope FEATURE [--add FILE --reason TEXT]
  trace.py gate FEATURE --base main
  trace.py implement FEATURE --req REQ-001 --symbol S --commit SHA --evidence diff="..."
  trace.py verify FEATURE --req REQ-001 --test path/T.java::T.case --commit SHA
  trace.py settle FEATURE | --all
  trace.py validate [MANIFEST ...]          (default: every trace/*.yml)
  trace.py summary FEATURE                  markdown for the PR body

Exit codes: 0 ok, 1 gate or validation failed, 2 bad input.
"""

import argparse
import datetime as dt
import json
import re
import subprocess
import sys
from pathlib import Path

# ---------------------------------------------------------------- yaml subset
# PyYAML is not guaranteed and the harness only requires python3. trace.py is
# the only writer of manifests, so a parser for the subset it emits (plus the
# block style of ontology.yml) is enough: block mappings, block sequences,
# flow lists of scalars, quoted or plain scalars, comments.

_NUM = re.compile(r"^-?\d+(\.\d+)?$")


def _scalar(s: str):
    s = s.strip()
    if s.startswith('"') and s.endswith('"') and len(s) >= 2:
        return json.loads(s)
    if s.startswith("[") and s.endswith("]"):
        inner = s[1:-1].strip()
        return [_scalar(x) for x in _split_flow(inner)] if inner else []
    if s in ("null", "~", ""):
        return None
    if s in ("true", "false"):
        return s == "true"
    if _NUM.match(s):
        return float(s) if "." in s else int(s)
    return s


def _split_flow(s: str) -> list[str]:
    out, buf, q = [], "", False
    for ch in s:
        if ch == '"':
            q = not q
        if ch == "," and not q:
            out.append(buf)
            buf = ""
        else:
            buf += ch
    out.append(buf)
    return out


def _strip_comment(line: str) -> str:
    q = False
    for i, ch in enumerate(line):
        if ch == '"':
            q = not q
        elif ch == "#" and not q and (i == 0 or line[i - 1] in " \t"):
            return line[:i].rstrip()
    return line.rstrip()


def yaml_load(text: str):
    lines = []
    for raw in text.splitlines():
        line = _strip_comment(raw)
        if line.strip():
            lines.append((len(line) - len(line.lstrip(" ")), line.strip()))
    value, _ = _parse_block(lines, 0, 0)
    return value


def _parse_block(lines, i, indent):
    if i >= len(lines):
        return None, i
    if lines[i][1].startswith("- ") or lines[i][1] == "-":
        return _parse_seq(lines, i, lines[i][0])
    return _parse_map(lines, i, lines[i][0])


def _parse_map(lines, i, indent):
    out = {}
    while i < len(lines) and lines[i][0] == indent and not lines[i][1].startswith("- "):
        key, _, rest = lines[i][1].partition(":")
        key, rest = key.strip(), rest.strip()
        i += 1
        if rest:
            out[key] = _scalar(rest)
        elif i < len(lines) and lines[i][0] > indent:
            out[key], i = _parse_block(lines, i, lines[i][0])
        else:
            out[key] = None
    return out, i


def _parse_seq(lines, i, indent):
    out = []
    while i < len(lines) and lines[i][0] == indent and lines[i][1].startswith("-"):
        item = lines[i][1][1:].strip()
        if not item:
            i += 1
            val, i = _parse_block(lines, i, lines[i][0])
            out.append(val)
        elif ":" in item and not item.startswith(("[", '"')):
            # "- key: val" opens a mapping whose other keys sit at indent + 2
            child = indent + 2
            sub = [(child, item)]
            j = i + 1
            while j < len(lines) and lines[j][0] >= child:
                sub.append(lines[j])
                j += 1
            val, _ = _parse_map(sub, 0, child)
            out.append(val)
            i = j
        else:
            out.append(_scalar(item))
            i += 1
    return out, i


def _emit_scalar(v) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, list):
        return "[" + ", ".join(_emit_scalar(x) for x in v) + "]"
    s = str(v)
    if (
        s == ""
        or re.search(r"[:#\[\]{},\"']|^\s|\s$|^-", s)
        or _NUM.match(s)
        or s in ("true", "false", "null")
    ):
        return json.dumps(s, ensure_ascii=False)
    return s


def yaml_dump(data, indent=0) -> str:
    pad = " " * indent
    out = []
    if isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, (dict,)) or (isinstance(v, list) and v and isinstance(v[0], dict)):
                out.append(f"{pad}{k}:")
                out.append(yaml_dump(v, indent + 2))
            else:
                out.append(f"{pad}{k}: {_emit_scalar(v)}")
    elif isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                body = yaml_dump(item, indent + 2).splitlines()
                out.append(f"{pad}- {body[0].strip()}")
                out.extend(body[1:])
            else:
                out.append(f"{pad}- {_emit_scalar(item)}")
    return "\n".join(x for x in out if x != "")


# ---------------------------------------------------------------- repo + files


def git(*args, cwd=None) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True)


def repo_root() -> Path:
    r = git("rev-parse", "--show-toplevel")
    if r.returncode != 0:
        sys.exit("[trace] not inside a git repository")
    return Path(r.stdout.strip())


def ontology(root: Path) -> dict:
    for p in (
        root / ".claude/graph/ontology.yml",
        Path(__file__).resolve().parent.parent / "graph/ontology.yml",
    ):
        if p.exists():
            return yaml_load(p.read_text(encoding="utf-8"))
    sys.exit("[trace] ontology.yml not found")


def manifest_path(root: Path, feature: str) -> Path:
    return root / "trace" / f"{feature}.yml"


def load(root: Path, feature: str) -> dict:
    p = manifest_path(root, feature)
    if not p.exists():
        sys.exit(f"[trace] no manifest for {feature}; run: trace.py init {feature} --prp ...")
    return yaml_load(p.read_text(encoding="utf-8")) or {}


def save(root: Path, feature: str, m: dict) -> None:
    p = manifest_path(root, feature)
    p.parent.mkdir(parents=True, exist_ok=True)
    header = (
        "# Traceability manifest. Written by .claude/scripts/trace.py only;\n"
        "# edit through it so the ontology and commit checks run.\n"
    )
    p.write_text(header + yaml_dump(m) + "\n", encoding="utf-8")


def today() -> str:
    return dt.date.today().isoformat()


def resolve_commit(sha: str, root: Path) -> str:
    """Full hash of an existing commit, or exit. Never record a hash git cannot find."""
    r = git("rev-parse", "--verify", "--quiet", f"{sha}^{{commit}}", cwd=root)
    if r.returncode != 0:
        sys.exit(f"[trace] commit {sha!r} does not exist in this repository; refusing to record it")
    return r.stdout.strip()[:12]


def head(root: Path) -> str:
    return resolve_commit("HEAD", root)


def symbol_file(symbol: str) -> str:
    return symbol.split("::", 1)[0]


def symbol_present(root: Path, symbol: str) -> bool:
    """File exists and still names the symbol's last segment."""
    path, _, name = symbol.partition("::")
    f = root / path
    if not f.is_file():
        return False
    if not name:
        return True
    leaf = re.split(r"[.#]", name)[-1]
    return (
        re.search(rf"\b{re.escape(leaf)}\b", f.read_text(encoding="utf-8", errors="replace"))
        is not None
    )


# ---------------------------------------------------------------- requirements

REQ_LINE = re.compile(r"^\s*[-*]\s*(?:\[[ xX]\]\s*)?(REQ-\d{3,})\s*[:.)-]?\s*(.+)$")


def reqs_from_prp(text: str) -> list[dict]:
    """REQ ids from PRP lines like `- [ ] REQ-001: Given ... then ...`."""
    out, seen = [], set()
    for line in text.splitlines():
        m = REQ_LINE.match(line)
        if m and m.group(1) not in seen:
            seen.add(m.group(1))
            out.append({"id": m.group(1), "text": m.group(2).strip()})
    return out


def reqs_from_atoms(data: dict) -> list[dict]:
    """atomize output: keep the atom ids, they are already stable."""
    atoms = data.get("atoms") or data.get("requirements") or []
    out = []
    for a in atoms:
        aid = a.get("id")
        text = a.get("text") or a.get("statement") or a.get("description") or ""
        if aid:
            out.append({"id": str(aid), "text": str(text).strip()})
    return out


# ---------------------------------------------------------------- commands


def cmd_init(a, root):
    if a.atoms:
        reqs = reqs_from_atoms(json.loads(Path(a.atoms).read_text(encoding="utf-8")))
        source = "atomize"
    elif a.prp:
        reqs = reqs_from_prp(Path(a.prp).read_text(encoding="utf-8"))
        source = "prp"
    else:
        print("[trace] init needs --prp or --atoms", file=sys.stderr)
        return 2
    if not reqs:
        print(
            "[trace] no requirement ids found (PRP criteria must read `- [ ] REQ-001: ...`)",
            file=sys.stderr,
        )
        return 2
    m = {
        "feature": a.feature,
        "ontology": ontology(root).get("version"),
        "source": source,
        "base": head(root),
        "requirements": reqs,
        "scope": [],
        "links": [],
    }
    save(root, a.feature, m)
    print(f"[trace] {len(reqs)} requirements -> {manifest_path(root, a.feature).relative_to(root)}")
    return 0


def _kv(pairs: list[str]) -> dict:
    out = {}
    for p in pairs or []:
        k, _, v = p.partition("=")
        if not v:
            sys.exit(f"[trace] evidence must be key=value, got {p!r}")
        out[k.strip()] = v.strip()
    return out


def _req_ids(m) -> set:
    return {r["id"] for r in m.get("requirements") or []}


def cmd_propose(a, root):
    m = load(root, a.feature)
    if a.req not in _req_ids(m):
        print(f"[trace] unknown requirement {a.req}", file=sys.stderr)
        return 2
    evidence = _kv(a.evidence)
    if not evidence or not a.method:
        print("[trace] a proposed link needs --method and --evidence", file=sys.stderr)
        return 2
    link = {
        "from": a.req,
        "to": a.symbol,
        "type": "AFFECTS",
        "status": "PROPOSED",
        "confidence": round(float(a.confidence), 2),
        "methods": a.method,
        "evidence": evidence,
        "commit": head(root),
        "recorded": today(),
    }
    links = [
        lk
        for lk in m.get("links") or []
        if not (lk["type"] == "AFFECTS" and lk["from"] == a.req and lk["to"] == a.symbol)
    ]
    links.append(link)
    m["links"] = links
    f = symbol_file(a.symbol)
    if f not in {s["file"] for s in m.get("scope") or []}:
        m.setdefault("scope", []).append({"file": f, "reason": f"AFFECTS from {a.req}"})
    save(root, a.feature, m)
    print(f"[trace] {a.req} AFFECTS {a.symbol} (PROPOSED, {link['confidence']})")
    return 0


def cmd_scope(a, root):
    m = load(root, a.feature)
    if a.add:
        if not a.reason:
            print("[trace] widening scope needs --reason", file=sys.stderr)
            return 2
        if a.add not in {s["file"] for s in m.get("scope") or []}:
            m.setdefault("scope", []).append({"file": a.add, "reason": a.reason})
            save(root, a.feature, m)
    for s in m.get("scope") or []:
        print(f"{s['file']}\t{s.get('reason', '')}")
    return 0


# Paths the harness itself writes during a run; never scope violations.
HARNESS_PATHS = (".claude/", "trace/", "AGENTS.md", "CLAUDE.md")


def cmd_gate(a, root):
    m = load(root, a.feature)
    base = a.base or m.get("base")
    r = git("diff", "--name-only", f"{base}...HEAD", cwd=root)
    if r.returncode != 0:
        print(f"[trace] cannot diff against {base}: {r.stderr.strip()}", file=sys.stderr)
        return 2
    changed = {f for f in r.stdout.split() if f}
    wt = git("status", "--porcelain", "--untracked-files=no", cwd=root).stdout.splitlines()
    changed |= {lk[3:].split(" -> ")[-1] for lk in wt if lk[3:]}
    allowed = {s["file"] for s in m.get("scope") or []}
    outside = sorted(f for f in changed if f not in allowed and not f.startswith(HARNESS_PATHS))
    if outside:
        print("[trace] SCOPE GATE FAILED. Files changed outside the plan's scope:")
        for f in outside:
            print(f"  {f}")
        print(
            "Either revert them, or widen scope on purpose: "
            f'trace.py scope {a.feature} --add <file> --reason "..."'
        )
        return 1
    print(
        f"[trace] scope gate passed: {len(changed)} changed, all inside {len(allowed)} scoped files"
    )
    return 0


def cmd_implement(a, root):
    m = load(root, a.feature)
    if a.req not in _req_ids(m):
        print(f"[trace] unknown requirement {a.req}", file=sys.stderr)
        return 2
    m.setdefault("links", []).append(
        {
            "from": a.symbol,
            "to": a.req,
            "type": "IMPLEMENTS",
            "commit": resolve_commit(a.commit, root),
            "evidence": _kv(a.evidence) or {"diff": "commit touches symbol"},
            "recorded": today(),
        }
    )
    save(root, a.feature, m)
    print(f"[trace] {a.symbol} IMPLEMENTS {a.req}")
    return 0


def cmd_verify(a, root):
    m = load(root, a.feature)
    if a.req not in _req_ids(m):
        print(f"[trace] unknown requirement {a.req}", file=sys.stderr)
        return 2
    m.setdefault("links", []).append(
        {
            "from": a.req,
            "to": a.test,
            "type": "VERIFIED_BY",
            "commit": resolve_commit(a.commit, root),
            "recorded": today(),
        }
    )
    save(root, a.feature, m)
    print(f"[trace] {a.req} VERIFIED_BY {a.test}")
    return 0


def cmd_settle(a, root):
    """After merge: tested links become VALIDATED, links whose symbol moved become STALE.

    `--all` settles every manifest; /sse:plan runs it first, so the next feature
    carries what merged before it and the harness never commits to main itself.
    """
    if a.all:
        for f in sorted((root / "trace").glob("*.yml")):
            a.feature = f.stem
            settle_one(a, root)
        return 0
    if not a.feature:
        print("[trace] settle needs FEATURE or --all", file=sys.stderr)
        return 2
    return settle_one(a, root)


def settle_one(a, root):
    m = load(root, a.feature)
    verified = {lk["from"] for lk in m.get("links") or [] if lk["type"] == "VERIFIED_BY"}
    counts = {"VALIDATED": 0, "STALE": 0, "PROPOSED": 0}
    for lk in m.get("links") or []:
        if lk["type"] != "AFFECTS":
            continue
        if not symbol_present(root, lk["to"]):
            lk["status"] = "STALE"
            lk.setdefault("evidence", {})["settle"] = f"symbol not found at {head(root)}"
        elif lk["from"] in verified:
            lk["status"] = "VALIDATED"
        counts[lk["status"]] += 1
    m["settled"] = head(root)
    save(root, a.feature, m)
    print(f"[trace] settled {a.feature}: " + ", ".join(f"{k} {v}" for k, v in counts.items()))
    return 0


def validate_manifest(m: dict, onto: dict, root: Path, name: str) -> list[str]:
    errs = []
    edges = onto.get("edges") or {}
    reqs = _req_ids(m)
    for i, lk in enumerate(m.get("links") or []):
        where = f"{name} link {i + 1}"
        t = lk.get("type")
        spec = edges.get(t)
        if not spec:
            errs.append(f"{where}: edge type {t!r} not in ontology")
            continue
        for field in spec.get("requires") or []:
            if lk.get(field) in (None, "", [], {}):
                errs.append(f"{where}: {t} requires {field!r}")
        if spec.get("statuses") and lk.get("status") not in spec["statuses"]:
            errs.append(f"{where}: status {lk.get('status')!r} not in {spec['statuses']}")
        req_end = lk.get("from") if spec.get("from") == "Requirement" else lk.get("to")
        if req_end not in reqs:
            errs.append(f"{where}: requirement {req_end!r} not declared in requirements")
        if (
            lk.get("commit")
            and git("cat-file", "-e", f"{lk['commit']}^{{commit}}", cwd=root).returncode != 0
        ):
            errs.append(f"{where}: commit {lk['commit']!r} does not exist")
    return errs


def cmd_validate(a, root):
    onto = ontology(root)
    files = [Path(p) for p in a.manifests] or sorted((root / "trace").glob("*.yml"))
    errs = []
    for f in files:
        errs += validate_manifest(
            yaml_load(f.read_text(encoding="utf-8")) or {}, onto, root, f.name
        )
    for e in errs:
        print(f"[trace] {e}")
    print(f"[trace] validated {len(files)} manifest(s), {len(errs)} error(s)")
    return 1 if errs else 0


def cmd_summary(a, root):
    m = load(root, a.feature)
    links = m.get("links") or []
    print(f"### Traceability (`trace/{a.feature}.yml`)\n")
    print("| Requirement | Affects | Status | Implemented | Verified by |")
    print("|---|---|---|---|---|")
    for r in m.get("requirements") or []:
        rid = r["id"]
        aff = [lk for lk in links if lk["type"] == "AFFECTS" and lk["from"] == rid]
        imp = [lk["from"] for lk in links if lk["type"] == "IMPLEMENTS" and lk["to"] == rid]
        ver = [lk["to"] for lk in links if lk["type"] == "VERIFIED_BY" and lk["from"] == rid]
        targets = ", ".join(f"`{lk['to']}`" for lk in aff) or "none"
        status = ", ".join(sorted({lk["status"] for lk in aff})) or "none"
        print(
            f"| {rid} | {targets} | {status} | {len(imp)} | "
            f"{', '.join(f'`{t}`' for t in ver) or 'none'} |"
        )
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("init")
    p.add_argument("feature")
    p.add_argument("--prp")
    p.add_argument("--atoms")
    p = sub.add_parser("propose")
    p.add_argument("feature")
    p.add_argument("--req", required=True)
    p.add_argument("--symbol", required=True)
    p.add_argument("--method", action="append")
    p.add_argument("--evidence", action="append")
    p.add_argument("--confidence", default="0.5")
    p = sub.add_parser("scope")
    p.add_argument("feature")
    p.add_argument("--add")
    p.add_argument("--reason")
    p = sub.add_parser("gate")
    p.add_argument("feature")
    p.add_argument("--base")
    p = sub.add_parser("implement")
    p.add_argument("feature")
    p.add_argument("--req", required=True)
    p.add_argument("--symbol", required=True)
    p.add_argument("--commit", required=True)
    p.add_argument("--evidence", action="append")
    p = sub.add_parser("verify")
    p.add_argument("feature")
    p.add_argument("--req", required=True)
    p.add_argument("--test", required=True)
    p.add_argument("--commit", required=True)
    p = sub.add_parser("settle")
    p.add_argument("feature", nargs="?")
    p.add_argument("--all", action="store_true")
    p = sub.add_parser("validate")
    p.add_argument("manifests", nargs="*")
    p = sub.add_parser("summary")
    p.add_argument("feature")
    a = ap.parse_args()
    root = repo_root()
    return {
        "init": cmd_init,
        "propose": cmd_propose,
        "scope": cmd_scope,
        "gate": cmd_gate,
        "implement": cmd_implement,
        "verify": cmd_verify,
        "settle": cmd_settle,
        "validate": cmd_validate,
        "summary": cmd_summary,
    }[a.cmd](a, root)


if __name__ == "__main__":
    sys.exit(main())
