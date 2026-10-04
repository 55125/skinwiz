"""Unit tests for product_merge.py (the de-duplication rules behind
build_product_merges.py). Run from tools/catalog_pipeline:

    python3 -m unittest discover -s tests
"""
from __future__ import annotations

import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

from product_merge import (  # noqa: E402
    Product, UnionFind, choose_canonical, exclusion_reason, formula_check, group_conflicts, name_tokens,
    spf_values, tier_for,
)

LIST = ["water", "glycerin", "cetearyl-alcohol", "dimethicone", "phenoxyethanol", "carbomer", "tocopherol"]


def fda(id_: str, name: str, strengths=None, actives=("zinc-oxide",), maker="Acme Labs", form="LOTION", **kw) -> Product:
    p = Product(id=id_, source="openfda", brand_name=name, manufacturer=maker, dosage_form=form,
                active_ids=list(actives), strengths=strengths if strengths is not None else {"zinc-oxide": 20.0},
                ingredients=list(kw.pop("ingredients", LIST)), allergen_hits=kw.pop("allergen_hits", []),
                free_from=kw.pop("free_from", ["fragrance-free"]), **kw)
    p.ingredient_names = list(p.ingredients)
    return p


def obf(id_: str, name: str, brand: str = "Acme", **kw) -> Product:
    p = Product(id=id_, source="open_beauty_facts", brand_name=name, manufacturer=brand, dosage_form="",
                active_ids=list(kw.pop("actives", ["zinc-oxide"])), strengths=None,
                ingredients=list(kw.pop("ingredients", ["zinc-oxide"] + LIST)),
                allergen_hits=kw.pop("allergen_hits", []), free_from=kw.pop("free_from", ["fragrance-free"]), **kw)
    p.ingredient_names = list(p.ingredients)
    return p


class BlockingExclusions(unittest.TestCase):
    def test_same_product_passes(self):
        a = fda("1", "Acme Daily Mineral Sunscreen Lotion SPF 30")
        b = fda("2", "Acme Daily Mineral Sunscreen Lotion SPF 30 3 fl oz")
        self.assertIsNone(exclusion_reason(a, b))

    def test_typo_and_word_order_pass(self):
        a = fda("1", "Acme Hydrating Moisturizing Lotion SPF 30")
        b = fda("2", "Acme Moisturising Hydratng Lotion SPF30")
        self.assertIsNone(exclusion_reason(a, b))

    def test_face_wash_vs_facial_cleanser(self):
        self.assertEqual(sorted(name_tokens("Acme Facial Cleanser")), sorted(name_tokens("Acme Face Wash")))

    def test_strength_differs(self):
        a = fda("1", "Acme Acne Gel", strengths={"benzoyl-peroxide": 10.0}, actives=("benzoyl-peroxide",), form="GEL")
        b = fda("2", "Acme Acne Gel", strengths={"benzoyl-peroxide": 4.0}, actives=("benzoyl-peroxide",), form="GEL")
        self.assertEqual(exclusion_reason(a, b), "strength differs")

    def test_percent_in_name_differs(self):
        a = obf("1", "Acme Niacinamide Serum 10%", actives=["niacinamide"])
        b = obf("2", "Acme Niacinamide Serum 4%", actives=["niacinamide"])
        self.assertEqual(exclusion_reason(a, b), "percent differs")

    def test_spf_differs(self):
        a = fda("1", "Acme Sport Lotion SPF 30")
        b = fda("2", "Acme Sport Lotion SPF 50")
        self.assertEqual(exclusion_reason(a, b), "SPF differs")
        self.assertEqual(spf_values("Acme SPF50+ lotion"), {50})

    def test_variant_words(self):
        cases = [
            ("Acme Mineral Sunscreen Tinted SPF 30", "Acme Mineral Sunscreen SPF 30"),
            ("Acme Kids Sunscreen Lotion SPF 50", "Acme Sunscreen Lotion SPF 50"),
            ("Acme Baby Sunscreen Lotion SPF 50", "Acme Sunscreen Lotion SPF 50"),
            ("Acme Lotion Fragrance-Free", "Acme Lotion Scented"),
            ("Acme Lotion Fragrance Free", "Acme Lotion"),
            ("Acme Foundation SPF 15 Fair", "Acme Foundation SPF 15 Deep"),
            ("Acme Lip Balm SPF 15 Cherry", "Acme Lip Balm SPF 15 Mint"),
        ]
        for x, y in cases:
            with self.subTest(x=x, y=y):
                r = exclusion_reason(fda("1", x), fda("2", y))
                self.assertIsNotNone(r)
                self.assertTrue(r.startswith(("variant words", "body area")), r)

    def test_shade_numbers_never_count_as_typos(self):
        a = fda("1", "Halo Glow Skin Tint SPF 50 84513")
        b = fda("2", "Halo Glow Skin Tint SPF 50 84519")
        self.assertTrue(exclusion_reason(a, b).startswith("shade/model numbers"))

    def test_form_conflict(self):
        a = fda("1", "Acme Sunscreen Spray SPF 30", form="SPRAY")
        b = fda("2", "Acme Sunscreen Lotion SPF 30", form="LOTION")
        self.assertEqual(exclusion_reason(a, b), "dosage form differs")

    def test_store_brand_generics_are_different_products(self):
        a = fda("1", "Clotrimazole Cream", maker="Walgreens", actives=("clotrimazole",), strengths={"clotrimazole": 1.0})
        b = fda("2", "Clotrimazole Cream", maker="CVS Pharmacy", actives=("clotrimazole",), strengths={"clotrimazole": 1.0})
        self.assertEqual(exclusion_reason(a, b), "different brand")

    def test_rx_never_merges(self):
        a = fda("1", "Acme Adapalene Gel", is_rx=True)
        b = fda("2", "Acme Adapalene Gel")
        self.assertEqual(exclusion_reason(a, b), "rx")

    def test_cross_source_needs_the_drug_active_in_the_list(self):
        a = fda("1", "Acme Mineral Lotion SPF 30")
        b = obf("2", "Acme Mineral Lotion SPF 30", ingredients=LIST, actives=[])
        self.assertEqual(exclusion_reason(a, b), "actives differ")
        self.assertIsNone(exclusion_reason(a, obf("3", "Acme Mineral Lotion SPF 30")))


class FormulaAndTiers(unittest.TestCase):
    def test_reformulated_lists_conflict(self):
        a = fda("1", "Acme Lotion")
        b = fda("2", "Acme Lotion", ingredients=["water", "fragrance", "linalool", "mineral-oil", "paraffin", "talc"],
                allergen_hits=["fragrance", "linalool"])
        self.assertEqual(formula_check(a, b)[0], "conflict")
        self.assertEqual(tier_for("jev", 0.99, 0.99, "conflict", False), "different_reformulated")

    def test_tiers(self):
        self.assertEqual(tier_for("jev", 0.95, 0.92, "ok", False), "auto")
        self.assertEqual(tier_for("jev", 0.95, 0.85, "ok", False), "flagged")
        self.assertEqual(tier_for("jev", 0.95, 0.70, "ok", False), "flagged")  # runs disagree by > 0.2
        self.assertEqual(tier_for("jev", 0.40, 0.30, "ok", False), "different")
        self.assertEqual(tier_for("jev", 0.95, 0.95, "minor", False), "flagged")
        self.assertEqual(tier_for("barcode", 0.80, 0.78, "ok", True), "auto")
        self.assertEqual(tier_for("barcode", 0.70, 0.75, "ok", True), "flagged")  # names differ
        self.assertEqual(tier_for("barcode", 0.70, 0.75, "ok", True, names_match=True), "auto")
        self.assertEqual(tier_for("barcode", 0.70, 0.75, "ok", False, names_match=True), "flagged")
        self.assertEqual(tier_for("barcode", 0.95, 0.95, "minor", True), "flagged")
        self.assertEqual(tier_for("exact", None, None, "ok", False), "auto")


class Grouping(unittest.TestCase):
    def test_union_find_chains(self):
        uf = UnionFind()
        uf.union("c", "b")
        uf.union("b", "a")
        uf.union("x", "y")
        self.assertEqual(sorted(uf.groups()), [["a", "b", "c"], ["x", "y"]])

    def test_chain_conflict_is_detected(self):
        a = fda("1", "Acme Lotion SPF 30")
        b = fda("2", "Acme Lotion SPF 30")
        c = fda("3", "Acme Lotion SPF 30", strengths={"zinc-oxide": 10.0})
        self.assertEqual(group_conflicts([a, b]), [])
        self.assertTrue(group_conflicts([a, b, c]))

    def test_canonical_prefers_richest_record(self):
        bare = fda("1", "Acme Lotion", ingredients=[], free_from=None)
        labelled = fda("2", "Acme Lotion", has_label_sections=True)
        photo = obf("3", "Acme Lotion", real_photo=True, image_url="https://images.example/x.jpg")
        self.assertEqual(choose_canonical([bare, labelled, photo]).id, "2")  # full list + label sections
        self.assertEqual(choose_canonical([bare, photo]).id, "3")  # full list beats none
        # deterministic tie-break: smallest id
        self.assertEqual(choose_canonical([fda("b", "Acme Lotion"), fda("a", "Acme Lotion")]).id, "a")

    def test_canonical_retail_photo_over_label_artwork(self):
        a = fda("1", "Acme Lotion", label_photo=True)
        b = fda("2", "Acme Lotion")
        b.source = "brand_direct"
        b.real_photo = True
        self.assertEqual(choose_canonical([a, b]).id, "2")


if __name__ == "__main__":
    unittest.main()
