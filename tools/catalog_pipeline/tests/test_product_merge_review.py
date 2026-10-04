"""Unit tests for product_merge_review.py (the flagged-pair review rules) and
the SPL-title checks in product_merge.py. Run from tools/catalog_pipeline:

    python3 -m unittest discover -s tests
"""
from __future__ import annotations

import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)

from product_merge import artwork_shades, title_conflict  # noqa: E402
from product_merge_review import SPL_OMITTED_STAY_AGELESS, decide, ingredient_key, list_residual  # noqa: E402
from test_product_merges import LIST, fda, obf  # noqa: E402


class ListComparison(unittest.TestCase):
    def test_naming_noise_is_not_a_difference(self):
        a = ["water", "simmondsia-chinensis-seed-oil", "phenethyl-alcohol", "iron-oxides", "polyamide-8",
             "sodium-benzoate-citric-acid"]
        b = ["inactive-ingredients-water", "jojoba-oil", "phenylethyl-alcohol", "ferric-oxide-red",
             "ferrosoferric-oxide", "polyamide8", "sodium-benzoate", "citric-acid", "fil-1747"]
        self.assertEqual(list_residual(a, b), (set(), set()))

    def test_real_differences_remain(self):
        self.assertEqual(list_residual(LIST, LIST + ["fragrance"]), (set(), {"fragrance"}))
        # PEG-10 is not PEG-12: no typo matching across digits
        self.assertEqual(list_residual(["peg-10-dimethicone"], ["peg-12-dimethicone"]),
                         ({"peg-10-dimethicone"}, {"peg-12-dimethicone"}))

    def test_junk_parsed_as_ingredients_is_dropped(self):
        self.assertIsNone(ingredient_key("fil-1747"))
        self.assertIsNone(ingredient_key("none"))
        self.assertEqual(ingredient_key("in-active-ingredients-aloe-barbadensis-leaf-juice"),
                         "aloe-barbadensis-leaf-juice")


class Decisions(unittest.TestCase):
    def test_private_label_same_name_same_list_merges(self):
        a = fda("81693-0650", "Stay Ageless Tinted Mineral Sunscreen SPF 30", maker="Precision MD")
        b = fda("82000-0650", "Stay AgelessTinted Mineral Sunscreen SPF 30", maker="Skin & Laser Surgery Ctr")
        self.assertEqual(decide(a, b)[:2], ("merge", "R1a-white-label"))

    def test_different_names_same_formula_stay_separate(self):
        a = fda("1-1", "Stmb Fungal Nail Renewal", maker="Stmb Co")
        b = fda("2-1", "Lyssera Fungal Nail Renewal", maker="Lyssera Inc")
        self.assertEqual(decide(a, b)[0], "keep_separate")

    def test_store_brands_stay_separate(self):
        a = fda("1-1", "Tolnafate", maker="Meijer Distribution Inc.", spl_title="Meijer Tolnaftate Powder Spray",
                spl_set_id="s1")
        b = fda("2-1", "Tolnafate", maker="LEADER/ Cardinal Health", spl_title="Leader Tolnaftate Powder Spray",
                spl_set_id="s2")
        self.assertEqual(decide(a, b)[0], "keep_separate")

    def test_same_name_different_list_is_reformulated(self):
        a = fda("1-1", "Acme Daily Body Lotion", ingredients=LIST + ["talc"])
        b = fda("1-2", "Acme Daily Body Lotion")
        self.assertEqual(decide(a, b)[:2], ("reformulated", "R4-same-name-list-differs"))

    def test_brand_word_on_one_side_only_is_the_same_name(self):
        a = obf("1", "Cetaphil Gentle Skin Cleanser", brand="Cetaphil, Galderma")
        b = obf("2", "Gentle Skin Cleanser", brand="Cetaphil")
        self.assertEqual(decide(a, b)[:2], ("merge", "R2-neutral-name-words"))

    def test_spl_coded_list_of_the_white_label_formula(self):
        full = LIST + sorted(SPL_OMITTED_STAY_AGELESS)
        a = fda("81341-0651", "Stay Ageless Tinted Mineral Sunscreen SPF 30", maker="Pura Vida", ingredients=full)
        b = fda("81693-0650", "Stay Ageless Tinted Mineral Sunscreen SPF 30", maker="Precision MD")
        self.assertEqual(decide(a, b)[:2], ("merge", "R3-spl-coding-white-label"))

    def test_missing_list_needs_the_owner(self):
        a = fda("1-1", "Acme Cream", ingredients=[])
        b = fda("1-2", "Acme Cream")
        self.assertEqual(decide(a, b)[0], "needs_owner")

    def test_strength_differs(self):
        a = fda("1-1", "Acme Cream", strengths={"zinc-oxide": 20.0})
        b = fda("1-2", "Acme Cream", strengths={"zinc-oxide": 25.0})
        self.assertEqual(decide(a, b)[0], "keep_separate")


class SplTitles(unittest.TestCase):
    def test_scent_in_the_title_splits_a_brand_only_name(self):
        a = fda("64942-1", "Dove", maker="Conopco", spl_set_id="s1",
                spl_title="Dove Advanced Care Invisible Sheer Cool 48H Antiperspirant")
        b = fda("64942-2", "Dove", maker="Conopco", spl_set_id="s2",
                spl_title="Dove Advanced Care Invisible Sheer Fresh 48h Antiperspirant Deodorant")
        self.assertIn("variant", title_conflict(a, b) or "")
        same = fda("64942-3", "Dove", maker="Conopco, Inc.", spl_set_id="s3",
                   spl_title="Dove Advanced Care Invisible Sheer Cool 48h Antiperspirant Deodorant")
        self.assertIsNone(title_conflict(a, same))

    def test_any_title_word_counts_when_the_names_are_identical(self):
        a = fda("64942-1", "Degree", maker="Conopco", spl_set_id="s1",
                spl_title="Degree Advanced Apple & Gardenia Dry Spray 72H Antiperspirant Deodorant")
        b = fda("64942-2", "Degree", maker="Conopco", spl_set_id="s2",
                spl_title="Degree Advanced Adventure Dry Spray 72H Antiperspirant Deodorant")
        self.assertIsNotNone(title_conflict(a, b))

    def test_brand_only_name_without_title_is_not_matched(self):
        a = fda("71825-121", "Cremo Company", maker="Cremo Company", spl_set_id="s1", spl_title="Active ingredient")
        b = fda("71825-141", "Cremo Company", maker="Cremo Company", spl_set_id="s2", spl_title="Active Ingredient")
        self.assertIn("brand-only", title_conflict(a, b) or "")

    def test_ndc_codes_and_pack_sizes_in_titles_are_ignored(self):
        a = fda("71927-015", "Hydrocortisone Cream", spl_set_id="s1",
                spl_title="71927-015 American Safety & First Aid Hydrocortisone Cream 1%")
        b = fda("71927-031", "Hydrocortisone Cream", spl_set_id="s2",
                spl_title="71927-031 American Safety & First Aid Hydrocortisone Cream 1% 30 g")
        self.assertIsNone(title_conflict(a, b))

    def test_artwork_shades(self):
        self.assertEqual(artwork_shades(["Shade 29 Carton.jpg", "The Uniform_Shade 02.jpg", "Sun Shades.jpg"]),
                         frozenset({"29", "2"}))
        a = fda("59735-203", "Tula Skin Tint", spl_set_id="s1", artwork_shades=frozenset({"29"}))
        b = fda("59735-204", "Tula Skin Tint", spl_set_id="s2", artwork_shades=frozenset({"27"}))
        self.assertIn("shades", title_conflict(a, b) or "")


if __name__ == "__main__":
    unittest.main()
