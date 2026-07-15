#!/usr/bin/env python3
"""
Token-phase accounting for the product-manager plugin.

Reads start and end markers, sums Claude session token usage from the
transcript JSONL within the time window, and appends a phase entry to
outputs/tokens/{feature_id}.json.

Usage:
  token-phase.py --feature-id ID --phase NAME --plugin-dir PATH
                 [--prd-path PATH] [--prp-path PATH]
                 [--attempts N] [--details JSON]

Exit 0 on success or graceful skip. Non-zero only on programming bug.
Never blocks the calling hook.
"""

import argparse
import json
import os
import sys
from pathlib import Path


def find_transcript(session_id: str | None) -> Path | None:
    """Locate the Claude Code transcript JSONL for the current session."""
    cwd = Path.cwd().resolve()
    encoded = str(cwd).replace("/", "-")
    project_dir = Path.home() / ".claude" / "projects" / encoded
    if not project_dir.exists():
        return None
    if session_id:
        candidate = project_dir / f"{session_id}.jsonl"
        if candidate.exists():
            return candidate
    jsonls = sorted(
        project_dir.glob("*.jsonl"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    return jsonls[0] if jsonls else None


def read_marker(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[token-phase] failed to read marker {path.name}: {e}", file=sys.stderr)
        return None


def sum_tokens(transcript: Path, started_at: str, ended_at: str) -> dict:
    """Sum usage tokens for assistant messages between start and end timestamps."""
    totals = {"input": 0, "output": 0, "cache_read": 0, "cache_creation": 0}
    try:
        with open(transcript, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                ts = entry.get("timestamp") or entry.get("ts")
                if not ts:
                    continue
                if ts < started_at or ts > ended_at:
                    continue
                msg = entry.get("message") or {}
                usage = msg.get("usage") or entry.get("usage")
                if not usage:
                    continue
                totals["input"] += usage.get("input_tokens", 0)
                totals["output"] += usage.get("output_tokens", 0)
                totals["cache_read"] += usage.get("cache_read_input_tokens", 0)
                totals["cache_creation"] += usage.get(
                    "cache_creation_input_tokens", 0
                )
    except Exception as e:
        print(f"[token-phase] failed to read transcript: {e}", file=sys.stderr)
    return totals


def update_tokens_json(
    tokens_path: Path, feature_id: str, files: dict, phase_entry: dict
):
    if tokens_path.exists():
        try:
            data = json.loads(tokens_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            data = None
    else:
        data = None

    if data is None:
        data = {
            "feature_id": feature_id,
            "files": {},
            "phases": [],
            "totals": {
                "input": 0,
                "output": 0,
                "cache_read": 0,
                "cache_creation": 0,
            },
        }

    data["files"].update({k: v for k, v in files.items() if v})

    duplicate = [
        p
        for p in data["phases"]
        if p.get("phase") == phase_entry["phase"]
        and p.get("started_at") == phase_entry["started_at"]
    ]
    if not duplicate:
        data["phases"].append(phase_entry)

    totals = {"input": 0, "output": 0, "cache_read": 0, "cache_creation": 0}
    for p in data["phases"]:
        for k in totals:
            totals[k] += p.get("tokens", {}).get(k, 0)
    data["totals"] = totals

    tokens_path.parent.mkdir(parents=True, exist_ok=True)
    tokens_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--feature-id", required=True)
    parser.add_argument("--phase", required=True)
    parser.add_argument("--plugin-dir", required=True, type=Path)
    parser.add_argument("--prd-path", default="")
    parser.add_argument("--prp-path", default="")
    parser.add_argument("--attempts", type=int, default=1)
    parser.add_argument("--details", default="{}")
    args = parser.parse_args()

    markers_dir = args.plugin_dir / ".markers"
    start_marker = markers_dir / f"{args.feature_id}.{args.phase}.start"
    end_marker = markers_dir / f"{args.feature_id}.{args.phase}.end"

    start_data = read_marker(start_marker)
    end_data = read_marker(end_marker)
    if not start_data or not end_data:
        print(
            f"[token-phase] missing markers for phase {args.phase} (feature {args.feature_id})",
            file=sys.stderr,
        )
        return 0

    started_at = start_data.get("timestamp")
    ended_at = end_data.get("timestamp")
    if not started_at or not ended_at:
        print("[token-phase] marker missing timestamp field", file=sys.stderr)
        return 0

    session_id = start_data.get("session_id") or os.environ.get("CLAUDE_SESSION_ID")

    transcript = find_transcript(session_id)
    if not transcript:
        print("[token-phase] transcript not found, skipping", file=sys.stderr)
        return 0

    tokens = sum_tokens(transcript, started_at, ended_at)

    try:
        details = json.loads(args.details) if args.details else {}
    except json.JSONDecodeError:
        details = {}

    phase_entry = {
        "phase": args.phase,
        "started_at": started_at,
        "ended_at": ended_at,
        "tokens": tokens,
        "attempts": args.attempts,
    }
    if details:
        phase_entry["details"] = details

    files = {}
    if args.prd_path:
        files["prd"] = args.prd_path
    if args.prp_path:
        files["prp"] = args.prp_path

    tokens_path = (
        args.plugin_dir / "tokens" / f"{args.feature_id}.json"
    )
    update_tokens_json(tokens_path, args.feature_id, files, phase_entry)

    for m in (start_marker, end_marker):
        try:
            m.unlink()
        except FileNotFoundError:
            pass

    print(
        f"[token-phase] {args.phase}: in={tokens['input']} "
        f"out={tokens['output']} cache_r={tokens['cache_read']}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
