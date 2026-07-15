#!/usr/bin/env python3
"""
Tests for the eval score verifier.

The gate used to be whatever number the judge wrote next to "weighted_total".
Nothing recomputed it from the dimension scores, and nothing checked the
dimensions against the rubric. These tests pin the arithmetic and the rubric
contract; they cannot pin whether an 8 is really an 8.
"""

import importlib.util
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
EVAL_SCORE = REPO / ".claude/scripts/eval-score.py"

spec = importlib.util.spec_from_file_location("eval_score", EVAL_SCORE)
es = importlib.util.module_from_spec(spec)
spec.loader.exec_module(es)

RUBRICS = sorted((REPO / ".claude/agents").glob("*/evals/*.md"))


class DimensionKey(unittest.TestCase):
    def test_matches_the_json_keys_the_rubrics_ask_for(self):
        self.assertEqual(es.dimension_key("Customer specificity"), "customer_specificity")
        self.assertEqual(es.dimension_key("Clarity"), "clarity")
        self.assertEqual(
            es.dimension_key("Scale, consistency & failure"), "scale_consistency_failure"
        )


class Arithmetic(unittest.TestCase):
    WEIGHTS = {"a": 50, "b": 50}

    def test_correct_total_passes(self):
        code, _ = es.verify(self.WEIGHTS, 8.0, {"scores": {"a": 8, "b": 8}, "weighted_total": 8.0})
        self.assertEqual(code, 0)

    def test_inflated_total_is_rejected(self):
        """The judge claiming 8.0 off scores that average 5.0 is the failure
        mode this exists for."""
        payload = {"scores": {"a": 5, "b": 5}, "weighted_total": 8.0}
        code, out = es.verify(self.WEIGHTS, 8.0, payload)
        self.assertEqual(code, 2)
        self.assertIn("does not follow", " ".join(out))

    def test_below_threshold_is_a_failure_not_an_error(self):
        code, _ = es.verify(self.WEIGHTS, 8.0, {"scores": {"a": 5, "b": 5}, "weighted_total": 5.0})
        self.assertEqual(code, 1)

    def test_total_is_computed_when_the_judge_omits_it(self):
        code, out = es.verify(self.WEIGHTS, 8.0, {"scores": {"a": 9, "b": 9}})
        self.assertEqual(code, 0)
        self.assertIn("9.00", " ".join(out))

    def test_missing_dimension_is_an_error(self):
        code, _ = es.verify(self.WEIGHTS, 8.0, {"scores": {"a": 9}})
        self.assertEqual(code, 2)

    def test_invented_dimension_is_an_error(self):
        code, _ = es.verify(self.WEIGHTS, 8.0, {"scores": {"a": 9, "b": 9, "vibes": 10}})
        self.assertEqual(code, 2)

    def test_out_of_range_score_is_an_error(self):
        code, _ = es.verify(self.WEIGHTS, 8.0, {"scores": {"a": 11, "b": 9}})
        self.assertEqual(code, 2)


class RealRubrics(unittest.TestCase):
    """Contract tests over the rubrics actually shipped here."""

    def weighted_rubrics(self):
        for r in RUBRICS:
            weights, threshold = es.parse_rubric(r.read_text(encoding="utf-8"))
            if weights:
                yield r, weights, threshold

    def test_every_weighted_rubric_sums_to_100(self):
        for r, weights, _ in self.weighted_rubrics():
            with self.subTest(rubric=r.name):
                self.assertEqual(
                    sum(weights.values()), 100,
                    f"{r.name} weights sum to {sum(weights.values())}: {weights}",
                )

    def test_every_weighted_rubric_declares_a_threshold(self):
        for r, _, threshold in self.weighted_rubrics():
            with self.subTest(rubric=r.name):
                self.assertIsNotNone(threshold, f"{r.name} has weights but no Threshold: line")

    def test_rubric_dimensions_match_the_output_format_it_asks_for(self):
        """A judge told to emit keys the rubric does not weight, or vice versa,
        produces a total nobody can recompute."""
        import json
        import re

        for r, weights, _ in self.weighted_rubrics():
            md = r.read_text(encoding="utf-8")
            m = re.search(r"```json\s*(\{.*?\})\s*```", md, re.DOTALL)
            if not m:
                continue
            with self.subTest(rubric=r.name):
                declared = set(json.loads(m.group(1)).get("scores", {}))
                self.assertEqual(
                    declared, set(weights),
                    f"{r.name}: output format asks for {sorted(declared)} "
                    f"but the rubric weights {sorted(weights)}",
                )


if __name__ == "__main__":
    unittest.main(verbosity=2)
