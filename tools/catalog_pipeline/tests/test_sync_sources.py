"""Unit tests for sync_sources.py's additive merge. Run from tools/catalog_pipeline:

    python3 -m unittest discover -s tests
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sync_sources import US_BARCODES_ONLY, append_rows, new_rows, open_source_image, us_or_canada_barcode


class NewRows(unittest.TestCase):
    def test_keeps_only_unknown_ids_once(self):
        fresh = [{"product_ndc": "a"}, {"product_ndc": "b"}, {"product_ndc": "b"}, {"product_ndc": ""}]
        self.assertEqual(new_rows(fresh, {"a"}), [{"product_ndc": "b"}])

    def test_a_known_label_under_a_new_ndc_is_not_new(self):
        renumbered = {"product_ndc": "42851-211", "spl_set_id": "set-1"}
        self.assertEqual(new_rows([renumbered], {"42851-202"}, {"set-1"}), [])

    def test_drops_a_kit_with_joined_lists(self):
        kit = {"product_ndc": "k", "source": "brand_direct", "active_ingredient_text": "The Glow Getter Body Wash Ingredients: Water, Glycerin"}
        self.assertEqual(new_rows([kit], set()), [])


class UsOrCanadaBarcode(unittest.TestCase):
    def test_keeps_us_and_canadian_upcs(self):
        self.assertTrue(us_or_canada_barcode("0075609199202"))  # Olay, 13-digit form
        self.assertTrue(us_or_canada_barcode("810016298021"))  # UPC-A
        self.assertTrue(us_or_canada_barcode("0628747000017"))  # 062, inside the US range
        self.assertTrue(us_or_canada_barcode("7541234567890"))  # GS1 Canada

    def test_applies_to_obf_cosmetics_and_hair_care(self):
        self.assertEqual(US_BARCODES_ONLY, {"cosmetic", "hair_care"})

    def test_drops_other_countries_in_store_codes_and_skus(self):
        for code in ["4068134071095", "8909106057647", "5901887039877", "0571915454191", "0212345678905", "93579933", "anua-AA001755"]:
            self.assertFalse(us_or_canada_barcode(code), code)


class AppendRows(unittest.TestCase):
    def test_only_adds_lines_in_the_files_columns_and_line_ending(self):
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "c.csv")
            before = b'product_ndc,note\r\nold,"keeps, quotes"\r\n'
            with open(path, "wb") as f:
                f.write(before)
            append_rows(path, [{"note": "n", "product_ndc": "new", "extra": "dropped"}])
            with open(path, "rb") as f:
                self.assertEqual(f.read(), before + b"new,n\r\n")


class OpenSourceImage(unittest.TestCase):
    def test_uses_the_barcodes_photo(self):
        body = json.dumps({"product": {"image_front_url": "https://images.openbeautyfacts.org/x.jpg"}})
        self.assertEqual(open_source_image("8809738316993", lambda url: body), "https://images.openbeautyfacts.org/x.jpg")

    def test_no_photo_or_failed_lookup_means_self_host(self):
        self.assertEqual(open_source_image("8809738316993", lambda url: json.dumps({"status": 0})), "")
        self.assertEqual(open_source_image("8809738316993", lambda url: None), "")

    def test_skips_lookup_for_a_sku(self):
        self.assertEqual(open_source_image("anua-AA001755", lambda url: self.fail("looked up")), "")


if __name__ == "__main__":
    unittest.main()
