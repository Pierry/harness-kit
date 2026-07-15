#!/usr/bin/env python3
"""
Deterministic sensor runner.

Parses a markdown sensor file and applies its computational checks against an
artifact.

Böckeler's harness-engineering taxonomy splits sensors into two execution
types, and this runner only implements one of them:

  Execution: computational   deterministic, CPU-run, cheap enough for every
                             change. This runner enforces it.
  Execution: inferential     needs judgment (an LLM or a human applies it).
                             This runner refuses to run it, and says so, so
                             that callers record it as `inferential` rather
                             than silently green.

A sensor declaring `Execution: computational` that parses to zero checks is a
broken spec, not a pass. It exits 2. That failure mode shipped here once
already: three sensors wrote `## Required sections (all present, in order)`
while this file only accepted `(all must be present, in order)`, so the check
never fired and every artifact passed. Headings are matched leniently now, and
`--list-checks` plus the test suite exist to keep it honest.

Exit codes:
  0  all checks passed
  1  at least one check failed
  2  sensor spec is broken (declares computational work, parses to no checks)
  3  sensor is inferential, not runnable here (caller must not record a pass)

Usage:
  sensor-runner.py --sensor SENSOR.md --artifact ARTIFACT.md
  sensor-runner.py --sensor SENSOR.md --list-checks
"""

import argparse
import re
import sys
from pathlib import Path

EXIT_PASS = 0
EXIT_FAIL = 1
EXIT_SPEC_ERROR = 2
EXIT_INFERENTIAL = 3

COMPUTATIONAL = "computational"
INFERENTIAL = "inferential"


def execution_type(sensor_md: str) -> str:
    """Read the declared `Execution:` header. Absent defaults to computational,
    so a sensor that does no computational work has to say so out loud."""
    m = re.search(r"^Execution:\s*(\S+)", sensor_md, re.MULTILINE | re.IGNORECASE)
    if not m:
        return COMPUTATIONAL
    value = m.group(1).strip().lower()
    return value if value in (COMPUTATIONAL, INFERENTIAL) else COMPUTATIONAL


def _heading_text(line: str) -> str | None:
    m = re.match(r"^##+\s+(.+?)\s*$", line)
    if not m:
        return None
    text = m.group(1)
    text = re.sub(r"\s*\([^)]*\)\s*$", "", text)  # drop a trailing parenthetical
    return text.strip().rstrip(":").strip()


def section_body(text: str, heading: str) -> str | None:
    """Return the body of a `## heading` section, or None if not found.

    Matching is lenient on purpose: a trailing parenthetical is ignored, and a
    descriptive prefix is allowed, so `## Design doc, required sections (all
    present, in order)` still resolves to `Required sections`.
    """
    want = heading.lower()
    lines = text.splitlines()
    start = None
    for i, line in enumerate(lines):
        found = _heading_text(line)
        if found is None:
            continue
        found = found.lower()
        if found == want or found.endswith(", " + want) or found.endswith(" " + want):
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
    """Bullet items, falling back to a single comma-separated prose line.

    The fallback exists because `design-structure` listed its forbidden tokens
    as prose, which silently parsed to an empty list.
    """
    items = [
        m.group(1).strip()
        for m in re.finditer(r"^[-*]\s+(.+)$", body or "", re.MULTILINE)
    ]
    if items:
        return items
    for line in (body or "").splitlines():
        line = line.strip()
        if not line or line.startswith("(") or line.startswith("#"):
            continue
        if "," in line:
            return [p.strip() for p in line.split(",") if p.strip()]
        break
    return []


def _token_present(token: str, artifact_text: str) -> bool:
    """Word-boundary match for word-ish tokens, plain substring otherwise.

    `\\b` around a token like `{N}` never matches, so template tokens have to
    be searched literally.
    """
    clean = token.strip().strip("`")
    if not clean:
        return False
    if re.fullmatch(r"[\w][\w .\-]*", clean):
        return bool(re.search(rf"\b{re.escape(clean)}\b", artifact_text, re.IGNORECASE))
    return clean.lower() in artifact_text.lower()


def check_required_sections(sensor_md: str, artifact_text: str) -> list[str]:
    body = section_body(sensor_md, "Required sections")
    if not body:
        return []
    failures = []
    for section in bullets(body):
        clean = section.split("(", 1)[0].strip().strip("*").strip()
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


def check_required_tokens(sensor_md: str, artifact_text: str) -> list[str]:
    body = section_body(sensor_md, "Required tokens")
    if not body:
        return []
    return [
        f"missing required token: '{token.strip().strip('`')}'"
        for token in bullets(body)
        if not _token_present(token, artifact_text)
    ]


def check_forbidden_tokens(sensor_md: str, artifact_text: str) -> list[str]:
    body = section_body(sensor_md, "Forbidden tokens") or section_body(
        sensor_md, "Forbidden patterns"
    )
    if not body:
        return []
    return [
        f"forbidden token present: '{token.strip().strip('`')}'"
        for token in bullets(body)
        if _token_present(token, artifact_text)
    ]


def check_markdown_rules(sensor_md: str, artifact_text: str) -> list[str]:
    body = section_body(sensor_md, "Markdown rules")
    if not body:
        return []
    low = body.lower()
    failures = []
    if "exactly 1 h1" in low or "require_h1: true" in low or "1 h1 heading" in low:
        h1_count = len(re.findall(r"^#\s+\S", artifact_text, re.MULTILINE))
        if h1_count != 1:
            failures.append(f"expected exactly 1 H1, found {h1_count}")
    if "no em-dash" in low or "no em dash" in low:
        if "—" in artifact_text:
            failures.append("em-dash found; use commas/periods/parentheses instead")
    if "no ascii" in low:
        if re.search(r"^\s*\+[-+]{2,}\+\s*$", artifact_text, re.MULTILINE):
            failures.append("ASCII box-drawing detected; use Mermaid diagrams")
    m = re.search(r"at least (\d+) mermaid", low)
    if m:
        want = int(m.group(1))
        found = len(re.findall(r"^```mermaid\b", artifact_text, re.MULTILINE))
        if found < want:
            failures.append(f"expected at least {want} mermaid block(s), found {found}")
    return failures


CHECKS = (
    ("required sections", "Required sections", check_required_sections),
    ("forbidden sections", "Forbidden sections", check_forbidden_sections),
    ("required tokens", "Required tokens", check_required_tokens),
    ("forbidden tokens", "Forbidden tokens", check_forbidden_tokens),
    ("markdown rules", "Markdown rules", check_markdown_rules),
)


def parsed_checks(sensor_md: str) -> list[str]:
    """Names of the checks this sensor actually wires up.

    Empty means the spec declares computational work but expresses none of it in
    a form this runner understands. That is a spec error, not a pass.
    """
    names = []
    for name, heading, _ in CHECKS:
        body = section_body(sensor_md, heading)
        if body is None and heading == "Forbidden tokens":
            body = section_body(sensor_md, "Forbidden patterns")
        if body is None:
            continue
        if heading == "Markdown rules":
            # Counts only if it states at least one rule we implement.
            if check_markdown_rules(sensor_md, "# a\n# b\n"):
                names.append(name)
        elif bullets(body):
            names.append(name)
    return names


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sensor", required=True, type=Path)
    parser.add_argument("--artifact", type=Path)
    parser.add_argument(
        "--list-checks",
        action="store_true",
        help="print the checks this sensor wires up, then exit",
    )
    args = parser.parse_args()

    if not args.sensor.exists():
        print(f"[sensor-runner] sensor file not found: {args.sensor}", file=sys.stderr)
        return EXIT_SPEC_ERROR

    sensor_md = args.sensor.read_text(encoding="utf-8")
    name = args.sensor.name
    execution = execution_type(sensor_md)
    checks = parsed_checks(sensor_md)

    if args.list_checks:
        print(f"{name}: execution={execution} checks={','.join(checks) or 'none'}")
        return EXIT_PASS

    if execution == INFERENTIAL:
        print(
            f"[sensor-runner] {name} is inferential, not runnable here; "
            "a model or a human must apply it. Not a pass.",
            file=sys.stderr,
        )
        return EXIT_INFERENTIAL

    if not checks:
        print(
            f"[sensor-runner] {name} SPEC ERROR: declares Execution: computational "
            "but wires up no check this runner understands. Either express it as "
            "Required/Forbidden sections, Required/Forbidden tokens or Markdown "
            "rules, or declare `Execution: inferential`.",
            file=sys.stderr,
        )
        return EXIT_SPEC_ERROR

    if args.artifact is None:
        print("[sensor-runner] --artifact is required unless --list-checks", file=sys.stderr)
        return EXIT_SPEC_ERROR
    if not args.artifact.exists():
        print(f"[sensor-runner] artifact file not found: {args.artifact}", file=sys.stderr)
        return EXIT_FAIL

    artifact_text = args.artifact.read_text(encoding="utf-8")

    failures: list[str] = []
    for _, _, fn in CHECKS:
        failures += fn(sensor_md, artifact_text)

    if failures:
        print(f"[sensor-runner] {name} FAILED ({len(failures)} issue(s)):", file=sys.stderr)
        for f in failures:
            print(f"  - {f}", file=sys.stderr)
        return EXIT_FAIL

    print(f"[sensor-runner] {name} passed ({', '.join(checks)})", file=sys.stderr)
    return EXIT_PASS


if __name__ == "__main__":
    sys.exit(main())
