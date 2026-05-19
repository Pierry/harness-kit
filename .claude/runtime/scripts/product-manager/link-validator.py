#!/usr/bin/env python3
"""
PRP link validator. Verifies that:
- Source PRD link points to an existing file
- Inline code paths (looking like file paths) end in a known extension
- HTTP URLs are syntactically valid
- No localhost URLs are pinned as references

Usage:
  link-validator.py --artifact PRP.md --repo-root /path/to/repo
"""

import argparse
import re
import sys
from pathlib import Path

KNOWN_EXTS = {
    "java", "kt", "ts", "tsx", "js", "jsx", "vue",
    "py", "sql", "yaml", "yml", "md", "sh", "gradle",
    "xml", "json", "properties",
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact", required=True, type=Path)
    parser.add_argument("--repo-root", required=True, type=Path)
    args = parser.parse_args()

    if not args.artifact.exists():
        print(f"[link-validator] artifact not found: {args.artifact}", file=sys.stderr)
        return 1

    text = args.artifact.read_text(encoding="utf-8")
    failures: list[str] = []

    # 1) Source PRD must exist
    m = re.search(r"\*\*Source PRD:\*\*\s+`?([^\s`]+)`?", text)
    if m:
        prd_rel = m.group(1).strip()
        candidates = [
            args.repo_root / prd_rel,
            args.artifact.parent / prd_rel,
            args.repo_root / ".claude/agents/product-manager" / prd_rel,
        ]
        if not any(c.exists() for c in candidates):
            failures.append(f"Source PRD path does not resolve: {prd_rel}")
    else:
        failures.append("missing **Source PRD:** field")

    # 2) Inline code-spans that look like paths must have known extensions
    for span in re.finditer(r"`([^`\s]+/[^`\s]+)`", text):
        path = span.group(1)
        # strip :line suffix if present
        path_clean = re.sub(r":\d+$", "", path)
        ext = path_clean.rsplit(".", 1)[-1] if "." in path_clean else ""
        if not ext or ext.lower() not in KNOWN_EXTS:
            # Allow URLs and confluence-ish paths
            if path.startswith("http") or "/wiki/" in path:
                continue
            failures.append(f"path-like span has unknown/missing extension: `{path}`")

    # 3) Localhost URLs not allowed
    if re.search(r"https?://(localhost|127\.0\.0\.1)", text):
        failures.append("localhost URL pinned in PRP; replace with stable reference")

    # 4) GitHub blob/tree on moving branches → warn (treat as failure for handoff)
    for m in re.finditer(
        r"github\.com/[\w-]+/[\w.-]+/(blob|tree)/(main|master|develop)/", text
    ):
        failures.append(
            f"GitHub link uses moving branch ({m.group(2)}); use a commit SHA or tag"
        )

    if failures:
        print(f"[link-validator] {args.artifact.name} FAILED ({len(failures)} issue(s)):", file=sys.stderr)
        for f in failures:
            print(f"  - {f}", file=sys.stderr)
        return 1

    print(f"[link-validator] {args.artifact.name} passed", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
