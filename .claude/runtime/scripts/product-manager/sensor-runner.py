#!/usr/bin/env python3
"""
Deterministic sensor runner.

Parses a markdown sensor file (looking for known sections like
"Required sections", "Forbidden tokens", "Markdown rules") and applies the
checks against an artifact file. Returns exit code 0 if all checks pass, 1 if
any blocking check fails.

Usage:
  sensor-runner.py --sensor SENSOR.md --artifact ARTIFACT.md
"""

import argparse
import re
import sys
from pathlib import Path


def section_body(text: str, heading: str) -> str | None:
    """Return the body of a `## heading` section, or None if not found."""
    pattern = rf"^##+\s+{re.escape(heading)}\s*$"
    lines = text.splitlines()
    start = None
    for i, line in enumerate(lines):
        if re.match(pattern, line, re.IGNORECASE):
            start = i + 1
            break
    if start is None:
        return None
    end = len(lines)
    for i in range(start, len(lines)):
        if re.match(r"^##+\s+\S", lines[i]):
            end = i
            break
    return "\n".join(lines[start:end])


def bullets(body: str) -> list[str]:
    return [
        m.group(1).strip()
        for m in re.finditer(r"^[-*]\s+(.+)$", body or "", re.MULTILINE)
    ]


def check_required_sections(sensor_md: str, artifact_text: str) -> list[str]:
    body = section_body(sensor_md, "Required sections") or section_body(
        sensor_md, "Required sections (all must be present)"
    ) or section_body(sensor_md, "Required sections (all must be present, in order)")
    if not body:
        return []
    sections = bullets(body)
    failures = []
    for section in sections:
        clean = section.split("(", 1)[0].strip()
        pattern = rf"^##+\s+(\d+\)\s*)?{re.escape(clean)}\b"
        if not re.search(pattern, artifact_text, re.MULTILINE | re.IGNORECASE):
            failures.append(f"missing required section: '{clean}'")
    return failures


def check_forbidden_sections(sensor_md: str, artifact_text: str) -> list[str]:
    body = section_body(sensor_md, "Forbidden sections")
    if not body:
        return []
    failures = []
    for section in bullets(body):
        clean = section.split("(", 1)[0].strip()
        pattern = rf"^##+\s+(\d+\)\s*)?{re.escape(clean)}\b"
        if re.search(pattern, artifact_text, re.MULTILINE | re.IGNORECASE):
            failures.append(f"forbidden section present: '{clean}'")
    return failures


def check_forbidden_tokens(sensor_md: str, artifact_text: str) -> list[str]:
    body = section_body(sensor_md, "Forbidden tokens") or section_body(
        sensor_md, "Forbidden patterns"
    )
    if not body:
        return []
    failures = []
    for token in bullets(body):
        clean = token.strip("`")
        if re.search(rf"\b{re.escape(clean)}\b", artifact_text, re.IGNORECASE):
            failures.append(f"forbidden token present: '{clean}'")
    return failures


def check_markdown_rules(sensor_md: str, artifact_text: str) -> list[str]:
    body = section_body(sensor_md, "Markdown rules")
    if not body:
        return []
    failures = []
    if "exactly 1 H1" in body or "require_h1: true" in body or "1 H1 heading" in body:
        h1_count = len(re.findall(r"^#\s+\S", artifact_text, re.MULTILINE))
        if h1_count != 1:
            failures.append(f"expected exactly 1 H1, found {h1_count}")
    if "no em-dash" in body.lower() or "no em dash" in body.lower():
        if "—" in artifact_text:
            failures.append("em-dash (—) found; use commas/periods/parentheses instead")
    if "no ascii" in body.lower():
        if re.search(r"^\s*\+[-+]{2,}\+\s*$", artifact_text, re.MULTILINE):
            failures.append("ASCII box-drawing detected; use Mermaid diagrams")
    return failures


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sensor", required=True, type=Path)
    parser.add_argument("--artifact", required=True, type=Path)
    args = parser.parse_args()

    if not args.sensor.exists():
        print(f"[sensor-runner] sensor file not found: {args.sensor}", file=sys.stderr)
        return 1
    if not args.artifact.exists():
        print(f"[sensor-runner] artifact file not found: {args.artifact}", file=sys.stderr)
        return 1

    sensor_md = args.sensor.read_text(encoding="utf-8")
    artifact_text = args.artifact.read_text(encoding="utf-8")

    failures: list[str] = []
    failures += check_required_sections(sensor_md, artifact_text)
    failures += check_forbidden_sections(sensor_md, artifact_text)
    failures += check_forbidden_tokens(sensor_md, artifact_text)
    failures += check_markdown_rules(sensor_md, artifact_text)

    if failures:
        print(f"[sensor-runner] {args.sensor.name} FAILED ({len(failures)} issue(s)):", file=sys.stderr)
        for f in failures:
            print(f"  - {f}", file=sys.stderr)
        return 1

    print(f"[sensor-runner] {args.sensor.name} passed", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
