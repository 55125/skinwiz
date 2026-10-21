"""Unit tests for build_acne_sun_catalog.py's --niches mode (fetch some niches,
keep every other niche's rows). Run from tools/catalog_pipeline:

    python3 -m unittest discover -s tests
"""
from __future__ import annotations

import csv
import os
import sys
import tempfile
import unittest
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

import build_acne_sun_catalog as cat  # noqa: E402


def label(ndc: str, set_id: str, purpose: str, effective: str = "20260101") -> dict:
    return {
        "set_id": set_id,
        "effective_time": effective,
        "purpose": [purpose],
        "openfda": {"product_ndc": [ndc]} if ndc else {},
    }


class NichesMode(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        os.makedirs(os.path.join(self.dir.name, "output"))
        self.cwd = os.getcwd()
        os.chdir(self.dir.name)
        cat.write_csv(cat.CATALOG_CSV, [
            {"product_ndc": "1-1", "niche": "acne", "brand_name": "Acne Wash"},
            {"product_ndc": "2-2", "niche": "oral-care", "brand_name": "Old Toothpaste"},
        ], ["product_ndc", "niche", "brand_name"])
        cat.write_csv(cat.UNMATCHED_CSV, [
            {"niche": "acne", "spl_set_id": "a"},
            {"niche": "oral-care", "spl_set_id": "old"},
        ], ["niche", "spl_set_id"])

    def tearDown(self):
        os.chdir(self.cwd)
        self.dir.cleanup()

    def run_main(self, labels_by_purpose: dict[str, list[dict]]) -> None:
        with mock.patch.object(cat, "fetch_all_labels", lambda p: labels_by_purpose.get(p, [])), \
             mock.patch.object(cat, "enrich_with_ndc_directory", lambda rows: None), \
             mock.patch.object(sys, "argv", ["x", "--niches", "oral-care"]), \
             mock.patch("builtins.print"):
            cat.main()

    def read(self, path: str) -> list[dict]:
        with open(path, newline="") as f:
            return list(csv.DictReader(f))

    def test_replaces_only_the_named_niche(self):
        self.run_main({
            "Anticavity": [label("3-3", "s3", "Anticavity"), label("", "u1", "Anticavity")],
            # The same toothpaste and the same unresolved label again, via another purpose.
            "Antigingivitis": [label("3-3", "s3", "Anticavity, antigingivitis"), label("", "u1", "Antigingivitis")],
        })
        rows = self.read(cat.CATALOG_CSV)
        self.assertEqual([(r["product_ndc"], r["niche"]) for r in rows], [("1-1", "acne"), ("3-3", "oral-care")])
        unmatched = self.read(cat.UNMATCHED_CSV)
        self.assertEqual([(r["niche"], r["spl_set_id"]) for r in unmatched], [("acne", "a"), ("oral-care", "u1")])

    def test_unknown_niche_stops(self):
        with mock.patch.object(sys, "argv", ["x", "--niches", "oral"]):
            with self.assertRaises(SystemExit):
                cat.main()


if __name__ == "__main__":
    unittest.main()
