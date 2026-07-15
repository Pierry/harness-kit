#!/usr/bin/env python3
"""
Tests for the quality log.

Two things this file pins down:

1. The approval-marker regex. Only `<!-- approved: DATE score=N -->` parses, so
   a stage command that omits `score=` logs nothing. test and pr both did, and
   their eval scores were silently absent from the dashboard for every run.

2. The sensor dispatch. phase-log re-runs stage sensors itself instead of going
   through run-sensors.sh, so the two dispatch tables have to agree. When they
   drifted, `prp-links` went to sensor-runner (which cannot check links), exited
   2, and got logged as a failure.
"""

import importlib.util
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
PHASE_LOG = REPO / ".claude/scripts/phase-log.py"

spec = importlib.util.spec_from_file_location("phase_log", PHASE_LOG)
pl = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pl)


class ApprovalMarker(unittest.TestCase):
    def test_marker_with_score_parses(self):
        score, date = pl.parse_score("<!-- approved: 2026-07-15 score=8.5 -->")
        self.assertEqual(score, 8.5)
        self.assertEqual(date, "2026-07-15")

    def test_handoff_variant_parses(self):
        score, _ = pl.parse_score("<!-- approved: 2026-07-15 score=9 ready-for-handoff: true -->")
        self.assertEqual(score, 9)

    def test_marker_without_score_logs_nothing(self):
        """The shape test.md and pr.md used to emit. Documented here so the
        cost of dropping `score=` is visible rather than silent."""
        score, _ = pl.parse_score("<!-- approved: 2026-07-15 -->")
        self.assertIsNone(score)


class SensorDispatch(unittest.TestCase):
    """Must mirror the case statement in run-sensors.sh."""

    SCRIPTS = ".claude/runtime/scripts/staff-software-engineer"

    def test_links_go_to_the_link_validator(self):
        cmd = pl.sensor_command(self.SCRIPTS, "sensors/prp-links.md", "a.md")
        self.assertIn("link-validator.py", " ".join(cmd))

    def test_maintainability_goes_to_its_script(self):
        cmd = pl.sensor_command(self.SCRIPTS, "sensors/code-maintainability.md", "a.md")
        self.assertIn("maintainability.sh", " ".join(cmd))

    def test_everything_else_goes_to_the_markdown_runner(self):
        cmd = pl.sensor_command(self.SCRIPTS, "sensors/dev-structure.md", "a.md")
        self.assertIn("sensor-runner.py", " ".join(cmd))

    def test_every_dispatched_sensor_resolves_to_a_real_executable(self):
        """Only for the bucket that actually declares the sensor. A dispatch is
        a promise the tool exists where that stage will look for it."""
        exes = {"links": "link-validator.py", "maintainability": "maintainability.sh"}
        for stage, (bucket, names) in pl.STAGE_SENSORS.items():
            scripts = pl.BUCKET[bucket]["scripts"]
            for name in names:
                exe = next((v for k, v in exes.items() if k in name), None)
                if not exe:
                    continue
                with self.subTest(stage=stage, sensor=name):
                    cmd = pl.sensor_command(scripts, f"{name}.md", "a.md")
                    target = REPO / next(c for c in cmd if exe in c)
                    self.assertTrue(
                        target.exists(),
                        f"stage '{stage}' dispatches {name} to {target}, which does not exist",
                    )


class StageSensorsExist(unittest.TestCase):
    def test_every_named_stage_sensor_file_exists(self):
        for stage, (bucket, names) in pl.STAGE_SENSORS.items():
            sensor_dir = REPO / pl.BUCKET[bucket]["sensor_dir"]
            for name in names:
                with self.subTest(stage=stage, sensor=name):
                    self.assertTrue(
                        (sensor_dir / f"{name}.md").exists(),
                        f"{stage} logs sensor {name}, but "
                        f"{sensor_dir / (name + '.md')} does not exist",
                    )


if __name__ == "__main__":
    unittest.main(verbosity=2)
