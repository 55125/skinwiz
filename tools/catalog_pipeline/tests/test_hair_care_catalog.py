"""Unit tests for build_hair_care_catalog.py's row filter. Run from
tools/catalog_pipeline:

    python3 -m unittest discover -s tests
"""
from __future__ import annotations

import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

from build_hair_care_catalog import english_ingredients, to_row  # noqa: E402

INCI = "Water, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Panthenol, Fragrance, Methylisothiazolinone"


def obf(**kw) -> dict:
    return {"code": "0123456789012", "product_name": "Daily Shampoo", "brands": "Acme", "completeness": 0.6,
            "ingredients_text": INCI, "lang": "fr", "countries_tags": ["en:france"], **kw}


class HairCareRows(unittest.TestCase):
    def test_english_list_preferred(self):
        self.assertEqual(english_ingredients(obf(ingredients_text="Aqua, ...", ingredients_text_en=INCI)), INCI)

    def test_us_market_or_english_lang_keeps_the_list(self):
        self.assertEqual(english_ingredients(obf(countries_tags=["en:united-states"])), INCI)
        self.assertEqual(english_ingredients(obf(lang="en")), INCI)

    def test_non_english_product_is_skipped(self):
        self.assertIsNone(english_ingredients(obf()))

    def test_row_needs_no_tracked_active(self):
        row = to_row(obf(lang="en", ingredients_text="Water, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Fragrance"))
        self.assertIsNotNone(row)
        self.assertEqual((row["niche"], row["source"], row["verified"]), ("hair-care", "open_beauty_facts", "false"))
        self.assertEqual(row["active_ingredients_structured"], "")
        self.assertEqual(to_row(obf(lang="en"))["active_ingredients_structured"], "panthenol")

    def test_junk_is_dropped(self):
        self.assertIsNone(to_row(obf(lang="en", product_name="TEST shampoo")))

    def test_body_wash_without_hair_is_dropped(self):
        self.assertIsNone(to_row(obf(lang="en", product_name="Method Men Juniper Sage Body Wash")))
        self.assertIsNone(to_row(obf(lang="en", product_name="Sensitive Shower Gel Soothing")))
        self.assertIsNotNone(to_row(obf(lang="en", product_name="Invigorating Body, Face & Hair Wash")))
        self.assertIsNotNone(to_row(obf(lang="en", product_name="3in1 Shower, Shampoo & Conditioner")))


if __name__ == "__main__":
    unittest.main()
