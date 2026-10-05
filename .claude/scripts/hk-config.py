#!/usr/bin/env python3
"""
harness-kit project settings, kept in .claude/hk-config.json.

Two flags.

The eval judge:
  local  a fresh Claude evaluator scores the rubric (default, no extra cost)
  jev    Jev (TypeSafe AI) scores weighted rubrics; needs an API key

Graph engineering (traceability from requirement to code):
  off       the plain pipeline, nothing extra (default)
  manifest  REQ ids, trace/{feature}.yml, scope gate, link status; no infra
  full      manifest plus an embedded FalkorDB graph fed by Graphiti and the
            Joern CPG; Graphiti calls NVIDIA build models (free tier key)

The key itself never goes in hk-config.json, which is meant to be committed.
Either it already lives in an environment variable (only the variable name is
recorded), or it is written to the `env` block of .claude/settings.local.json,
which Claude Code keeps out of git and exports to every command it runs.

Usage:
  hk-config.py get eval                       judge, key var, whether the key is set
  hk-config.py eval local
  hk-config.py eval jev [--key-env NAME]      key exported under NAME (default TYPESAFE_API_KEY)
  hk-config.py eval jev --key -               read the key from stdin into settings.local.json
  hk-config.py get graph
  hk-config.py graph off | manifest
  hk-config.py graph full [--key-env NVIDIA_API_KEY] [--key -]

Exit codes:
  0  done
  1  bad usage
  4  judge set to jev, or graph set to full, but no key found under the configured variable
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

DEFAULT_KEY_ENV = "TYPESAFE_API_KEY"
JUDGES = ("local", "jev")
GRAPH_MODES = ("off", "manifest", "full")
DEFAULT_GRAPH_KEY_ENV = "NVIDIA_API_KEY"


def project_root() -> Path:
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env:
        return Path(env)
    here = Path.cwd()
    for p in (here, *here.parents):
        if (p / ".claude").is_dir():
            return p
    return here


def config_path(root: Path) -> Path:
    return root / ".claude" / "hk-config.json"


def read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def eval_settings(root: Path) -> dict:
    """Judge settings with defaults filled in. Used by jev-judge.py too."""
    cfg = read_json(config_path(root)).get("eval", {})
    return {
        "judge": cfg.get("judge", "local"),
        "key_env": cfg.get("key_env", DEFAULT_KEY_ENV),
    }


def graph_settings(root: Path) -> dict:
    """Graph mode with defaults filled in. Read by trace.py callers and graph.py."""
    cfg = read_json(config_path(root)).get("graph", {})
    return {
        "mode": cfg.get("mode", "off"),
        "key_env": cfg.get("key_env", DEFAULT_GRAPH_KEY_ENV),
    }


def key_value(root: Path, key_env: str) -> str | None:
    """Environment first, then the env block Claude Code reads from settings.local.json."""
    return os.environ.get(key_env) or read_json(root / ".claude" / "settings.local.json").get(
        "env", {}
    ).get(key_env)


def store_key(root: Path, key_env: str, key: str) -> None:
    local = root / ".claude" / "settings.local.json"
    data = read_json(local)
    data.setdefault("env", {})[key_env] = key
    write_json(local, data)
    os.chmod(local, 0o600)
    ensure_ignored(root, ".claude/settings.local.json")


def ensure_ignored(root: Path, rel: str) -> None:
    """Belt and braces: Claude Code ignores settings.local.json, but a repo may not."""
    if not (root / ".git").exists():
        return
    r = subprocess.run(["git", "-C", str(root), "check-ignore", "-q", rel])
    if r.returncode != 0:
        with open(root / ".gitignore", "a", encoding="utf-8") as f:
            f.write(f"\n{rel}\n")


def cmd_get_graph(root: Path) -> int:
    s = graph_settings(root)
    has_key = bool(key_value(root, s["key_env"]))
    print(f"graph={s['mode']} key_env={s['key_env']} key={'set' if has_key else 'missing'}")
    return 4 if s["mode"] == "full" and not has_key else 0


def cmd_graph(root: Path, mode: str, key_env: str, key: str | None) -> int:
    cfg = read_json(config_path(root))
    cfg["graph"] = {"mode": mode, "key_env": key_env}
    write_json(config_path(root), cfg)
    if mode == "full" and key == "-":
        key = sys.stdin.readline().strip()
        if not key:
            print("[hk-config] empty key on stdin", file=sys.stderr)
            return 1
        store_key(root, key_env, key)
        print(f"[hk-config] key stored as {key_env} in .claude/settings.local.json (git-ignored)")
    print(f"[hk-config] graph = {mode}")
    if mode == "full" and not key_value(root, key_env):
        print(
            f"[hk-config] {key_env} is not set (free key at https://build.nvidia.com). "
            "Until then graph.py runs without Graphiti: manifests and CPG only.",
            file=sys.stderr,
        )
        return 4
    return 0


def cmd_get(root: Path) -> int:
    s = eval_settings(root)
    has_key = bool(key_value(root, s["key_env"]))
    print(f"judge={s['judge']} key_env={s['key_env']} key={'set' if has_key else 'missing'}")
    return 4 if s["judge"] == "jev" and not has_key else 0


def cmd_eval(root: Path, judge: str, key_env: str, key: str | None) -> int:
    cfg = read_json(config_path(root))
    cfg["eval"] = {"judge": judge, "key_env": key_env}
    write_json(config_path(root), cfg)

    if judge == "jev" and key == "-":
        key = sys.stdin.readline().strip()
        if not key:
            print("[hk-config] empty key on stdin", file=sys.stderr)
            return 1
        store_key(root, key_env, key)
        print(f"[hk-config] key stored as {key_env} in .claude/settings.local.json (git-ignored)")

    print(f"[hk-config] eval judge = {judge}")
    if judge == "jev" and not key_value(root, key_env):
        print(
            f"[hk-config] {key_env} is not set. Export it, or run: "
            f"hk-config.py eval jev --key - (key on stdin). Until then evals use the Claude judge.",
            file=sys.stderr,
        )
        return 4
    if judge == "jev":
        print("[hk-config] restart Claude Code if the key was just added, so commands see it")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("get")
    g.add_argument("section", choices=["eval", "graph"])
    e = sub.add_parser("eval")
    e.add_argument("judge", choices=JUDGES)
    e.add_argument("--key-env", default=DEFAULT_KEY_ENV)
    e.add_argument("--key", help="'-' to read the key from stdin")
    gr = sub.add_parser("graph")
    gr.add_argument("mode", choices=GRAPH_MODES)
    gr.add_argument("--key-env", default=DEFAULT_GRAPH_KEY_ENV)
    gr.add_argument("--key", help="'-' to read the key from stdin")
    args = ap.parse_args()

    root = project_root()
    if args.cmd == "get":
        return cmd_get_graph(root) if args.section == "graph" else cmd_get(root)
    if args.cmd == "graph":
        return cmd_graph(root, args.mode, args.key_env, args.key)
    return cmd_eval(root, args.judge, args.key_env, args.key)


if __name__ == "__main__":
    sys.exit(main())
