#!/usr/bin/env python3
"""
Tests for the sensor runner.

The bug these exist to prevent: three sensors wrote
`## Required sections (all present, in order)` while the runner only accepted
`(all must be present, in order)`. The section check silently never ran, the
runner returned 0, and every artifact passed. A single assertion that an empty
artifact fails prd-structure would have caught it on day zero. Hence
`test_every_computational_sensor_rejects_an_empty_artifact`, which is generic:
it covers sensors that do not exist yet.

Run: python3 -m pytest tests/ -q     (or: python3 tests/test_sensor_runner.py)
"""

import subprocess
import sys
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
RUNNER = REPO / ".claude/runtime/scripts/product-manager/sensor-runner.py"
SENSOR_DIRS = sorted((REPO / ".claude/agents").glob("*/sensors"))

EXIT_PASS, EXIT_FAIL, EXIT_SPEC_ERROR, EXIT_INFERENTIAL = 0, 1, 2, 3

sys.path.insert(0, str(RUNNER.parent))
import importlib.util

spec = importlib.util.spec_from_file_location("sensor_runner", RUNNER)
sr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sr)


def run(sensor: Path, artifact: Path) -> int:
    return subprocess.run(
        [sys.executable, str(RUNNER), "--sensor", str(sensor), "--artifact", str(artifact)],
        capture_output=True,
    ).returncode


def all_sensors():
    for d in SENSOR_DIRS:
        yield from sorted(d.glob("*.md"))


def runs_in_this_runner(sensor: Path) -> bool:
    """run-sensors.sh dispatches `*links*` to link-validator.py instead, so
    those sensors are computational but never reach sensor-runner."""
    return "links" not in sensor.name


class HeadingMatching(unittest.TestCase):
    """section_body must tolerate the heading shapes sensors actually use."""

    CASES = [
        "## Required sections",
        "## Required sections (all present, in order)",
        "## Required sections (all must be present, in order)",
        "## Design doc, required sections (all present, in order)",
        "## REQUIRED SECTIONS",
    ]

    def test_all_heading_shapes_resolve(self):
        for heading in self.CASES:
            with self.subTest(heading=heading):
                body = sr.section_body(f"{heading}\n\n- Alpha\n", "Required sections")
                self.assertIsNotNone(body, f"{heading!r} did not resolve")
                self.assertEqual(sr.bullets(body), ["Alpha"])

    def test_unrelated_heading_does_not_resolve(self):
        self.assertIsNone(
            sr.section_body("## Forbidden sections\n\n- Alpha\n", "Required sections")
        )

    def test_review_doc_heading_is_not_mistaken_for_required_sections(self):
        # `## Review doc, required` must not satisfy `Required sections`.
        self.assertIsNone(
            sr.section_body("## Review doc, required (x)\n\n- Alpha\n", "Required sections")
        )


class Bullets(unittest.TestCase):
    def test_comma_prose_fallback(self):
        # design-structure listed forbidden tokens as prose, parsing to nothing.
        self.assertEqual(sr.bullets("a, b, c\n"), ["a", "b", "c"])

    def test_bullets_win_over_prose(self):
        self.assertEqual(sr.bullets("- a\n- b\n"), ["a", "b"])


class TokenMatching(unittest.TestCase):
    def test_template_token_is_found_literally(self):
        # \b around `{N}` never matches, so braces need a literal search.
        self.assertTrue(sr._token_present("{N}", "scale to {N} nodes"))
        self.assertTrue(sr._token_present("{System Name}", "# Design, {System Name}"))

    def test_word_token_respects_boundaries(self):
        self.assertTrue(sr._token_present("TODO", "a TODO here"))
        self.assertFalse(sr._token_present("xxx", "yxxxy"))


class Checks(unittest.TestCase):
    SENSOR = (
        "Execution: computational\n"
        "## Required sections\n\n- Alpha\n- Beta\n\n"
        "## Forbidden tokens\n\n- TODO\n\n"
        "## Markdown rules\n\n- exactly 1 H1 heading\n- no em-dash\n"
        "- at least 2 mermaid blocks\n"
    )

    def test_missing_section_fails(self):
        out = sr.check_required_sections(self.SENSOR, "## Alpha\n")
        self.assertEqual(len(out), 1)
        self.assertIn("Beta", out[0])

    def test_numbered_section_satisfies(self):
        self.assertEqual(sr.check_required_sections(self.SENSOR, "## 1) Alpha\n## 2) Beta\n"), [])

    def test_forbidden_token_fails(self):
        self.assertTrue(sr.check_forbidden_tokens(self.SENSOR, "a TODO here"))

    def test_mermaid_minimum(self):
        one = "# T\n```mermaid\nflowchart LR\n```\n"
        self.assertTrue(any("mermaid" in f for f in sr.check_markdown_rules(self.SENSOR, one)))
        two = one + "```mermaid\nsequenceDiagram\n```\n"
        self.assertFalse(any("mermaid" in f for f in sr.check_markdown_rules(self.SENSOR, two)))

    def test_em_dash_fails(self):
        self.assertTrue(any("em-dash" in f for f in sr.check_markdown_rules(self.SENSOR, "# T\na — b")))


class ExecutionContract(unittest.TestCase):
    def test_inferential_sensor_is_not_a_pass(self):
        """The whole point: an inferential sensor must never report green."""
        p = Path(self.tmp) / "inf.md"
        p.write_text("Execution: inferential\n\n## Check\n\nUse judgment.\n")
        art = Path(self.tmp) / "a.md"
        art.write_text("# anything\n")
        self.assertEqual(run(p, art), EXIT_INFERENTIAL)

    def test_computational_sensor_with_no_checks_is_a_spec_error(self):
        """A sensor that claims deterministic work but wires up none of it is
        broken, not passing. This is what code-conventions/test-coverage did."""
        p = Path(self.tmp) / "broken.md"
        p.write_text("Execution: computational\n\n## Backend (Java)\n\nRun the linter.\n")
        art = Path(self.tmp) / "a.md"
        art.write_text("# anything\n")
        self.assertEqual(run(p, art), EXIT_SPEC_ERROR)

    def setUp(self):
        import tempfile

        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = self._tmp.name

    def tearDown(self):
        self._tmp.cleanup()


class RealSensors(unittest.TestCase):
    """Contract tests over the sensors actually shipped in this repo."""

    def test_every_sensor_declares_an_execution_type(self):
        for s in all_sensors():
            with self.subTest(sensor=s.name):
                self.assertRegex(
                    s.read_text(),
                    r"(?m)^Execution:\s*(computational|inferential)\s*$",
                    f"{s.name} must declare Execution: computational|inferential",
                )

    def test_every_computational_sensor_wires_up_at_least_one_check(self):
        for s in all_sensors():
            md = s.read_text()
            if sr.execution_type(md) != sr.COMPUTATIONAL or not runs_in_this_runner(s):
                continue
            with self.subTest(sensor=s.name):
                self.assertTrue(
                    sr.parsed_checks(md),
                    f"{s.name} declares computational but parses to zero checks",
                )

    def test_every_computational_sensor_rejects_an_empty_artifact(self):
        """The regression test for the original bug. An artifact with none of
        the required sections must fail every computational sensor."""
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            art = Path(tmp) / "empty.md"
            art.write_text("# Nothing\n\nNo required sections here.\n")
            for s in all_sensors():
                md = s.read_text()
                if sr.execution_type(md) != sr.COMPUTATIONAL or not runs_in_this_runner(s):
                    continue
                with self.subTest(sensor=s.name):
                    self.assertEqual(
                        run(s, art), EXIT_FAIL, f"{s.name} passed an empty artifact"
                    )


if __name__ == "__main__":
    unittest.main(verbosity=2)
