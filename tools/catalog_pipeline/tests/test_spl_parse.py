"""Unit tests for spl_parse.py (and the per-product logic in
fetch_dailymed_inactive.py). Run from tools/catalog_pipeline:

    python3 -m unittest discover -s tests

`npm test` in app/ runs these too (src/lib/catalog-pipeline.test.ts).
"""
from __future__ import annotations

import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

from fetch_dailymed_inactive import rows_for  # noqa: E402
from spl_parse import (  # noqa: E402
    MediaCandidate, choose_image, inactive_section_text, media_candidates, parse_xml, product_inactive_lists, rank_media,
    spl_version, usable_images,
)


def fixture(name: str) -> str:
    with open(os.path.join(HERE, "fixtures", name), encoding="utf-8") as f:
        return f.read()


def pdp(name: str, caption: str = "", title: str = "PRINCIPAL DISPLAY PANEL", order: int = 0) -> MediaCandidate:
    return MediaCandidate(name=name, caption=caption, section_code="51945-4", section_title=title,
                          order=order, order_in_section=order)


class ImageHeuristic(unittest.TestCase):
    def best(self, cands: list[MediaCandidate]) -> str:
        return rank_media(cands)[0].name

    def test_front_beats_drug_facts_back_and_side(self):
        cands = [
            pdp("OUTER_BOX_Drug Facts Panel.jpg", order=0),
            pdp("OUTER_BOX_Back.jpg", order=1),
            pdp("OUTER_BOX_Side.jpg", order=2),
            pdp("OUTER_BOX_Front.jpg", order=3),
        ]
        self.assertEqual(self.best(cands), "OUTER_BOX_Front.jpg")

    def test_discontinued_packaging_loses_to_current(self):
        cands = [
            pdp("051887 Differin Gel 45g Carton (Tube) - DISC.jpg", order=0),
            pdp("061234 Differin Gel 45g Carton (Tube).jpg", order=1),
        ]
        self.assertEqual(self.best(cands), "061234 Differin Gel 45g Carton (Tube).jpg")

    def test_disc_carton_still_beats_an_insert(self):
        # Differin's real media list: two DISC cartons and a package insert.
        cands = [
            pdp("051887 P57217-0 Differin Gel 45g Carton (Tube) - DISC.jpg", order=0),
            pdp("052149 P56853-0 Differin Gel 45g Carton (Pump) - DISC.jpg", order=1),
            pdp("P56836-0 Insert.jpg", order=2),
        ]
        ranked = rank_media(cands)
        self.assertEqual(ranked[0].name, "051887 P57217-0 Differin Gel 45g Carton (Tube) - DISC.jpg")
        self.assertEqual(ranked[-1].name, "P56836-0 Insert.jpg")

    def test_all_disc_label_falls_back_to_best_disc_image(self):
        # Differin gel's real label: both cartons are "- DISC", filed in the
        # product-data section with the package insert, so everything scores
        # < 0. The old carton artwork beats no picture; the insert never shows.
        def other(name: str, order: int) -> MediaCandidate:
            return MediaCandidate(name=name, caption=name, section_code="48780-1", order=order, order_in_section=order)

        ranked = rank_media([
            other("052149 P56853-0 Differin Gel 45g Carton (Pump) - DISC.jpg", 1),
            other("051887 P57217-0 Differin Gel 45g Carton (Tube) - DISC.jpg", 0),
            other("P56836-0 Insert.jpg", 2),
        ])
        self.assertTrue(all(c.score < 0 for c in ranked))
        best, fallback = choose_image(ranked)
        self.assertTrue(fallback)
        self.assertEqual(best.name, "051887 P57217-0 Differin Gel 45g Carton (Tube) - DISC.jpg")
        usable, _ = usable_images(ranked)
        self.assertEqual([c.name for c in usable], [
            "051887 P57217-0 Differin Gel 45g Carton (Tube) - DISC.jpg",
            "052149 P56853-0 Differin Gel 45g Carton (Pump) - DISC.jpg",
        ])

    def test_no_disc_fallback_when_current_packaging_exists(self):
        # A current (non-DISC) carton filed outside the display panel: that is
        # a scoring question, not a DISC one -- no fallback, nothing chosen.
        def other(name: str, order: int) -> MediaCandidate:
            return MediaCandidate(name=name, caption=name, section_code="34068-7", order=order, order_in_section=order)

        ranked = rank_media([other("Carton - DISC.jpg", 0), other("Carton.jpg", 1)])
        self.assertTrue(all(c.score < 0 for c in ranked))
        self.assertEqual(choose_image(ranked), (None, False))
        # a usable current image is chosen normally, never the DISC one
        best, fallback = choose_image(rank_media([pdp("Carton - DISC.jpg", order=0), pdp("Front.jpg", order=1)]))
        self.assertEqual((best.name, fallback), ("Front.jpg", False))
        self.assertEqual(choose_image([]), (None, False))
        self.assertEqual(choose_image(rank_media([other("Insert.jpg", 0)])), (None, False))

    def test_dfb_abbreviation_and_caption_count(self):
        cands = [
            pdp("PDP.jpg", caption="image of PDP", order=0),
            pdp("DFB1.jpg", caption="image of DFB", order=1),
            pdp("DFB2.jpg", caption="image of DFB", order=2),
        ]
        ranked = rank_media(cands)
        self.assertEqual(ranked[0].name, "PDP.jpg")
        self.assertTrue(all(c.score < ranked[0].score for c in ranked[1:]))

    def test_chemical_structure_outside_display_panel_is_negative(self):
        struct = MediaCandidate(name="structure.jpg", caption="Structural formula", section_code="34089-3")
        label = pdp("label.jpg", caption="Label")
        ranked = rank_media([struct, label])
        self.assertEqual(ranked[0].name, "label.jpg")
        self.assertLess(ranked[1].score, 0)

    def test_barcode_and_camelcase_names(self):
        cands = [pdp("UpcBarcode.jpg", order=0), pdp("LetMeBeClearCartonFront.jpg", order=1)]
        self.assertEqual(self.best(cands), "LetMeBeClearCartonFront.jpg")

    def test_front_render_filed_in_another_section_wins(self):
        # real label: the flat panel in the display section, product renders
        # filed under another section
        cands = [
            pdp("kiwi panel.jpg", caption="Kiwi Panel", title="Package", order=0),
            MediaCandidate(name="kiwi from render.jpg", caption="kiwi from render", section_code="55106-9", order=1),
            MediaCandidate(name="kiwi back render.jpg", caption="kiwi back render", section_code="55106-9", order=2),
        ]
        ranked = rank_media(cands)
        self.assertEqual(ranked[0].name, "kiwi from render.jpg")
        self.assertEqual(ranked[-1].name, "kiwi back render.jpg")

    def test_product_container_beats_carton_dieline(self):
        cands = [pdp("waterfresh_carton.jpg", order=0), pdp("waterfresh_product.jpg", order=1)]
        self.assertEqual(self.best(cands), "waterfresh_product.jpg")

    def test_ties_keep_document_order(self):
        cands = [pdp("a.jpg", order=0), pdp("b.jpg", order=1)]
        self.assertEqual(self.best(cands), "a.jpg")

    def test_candidates_from_xml(self):
        root = parse_xml(fixture("spl_kit.xml"))
        cands = media_candidates(root)
        names = [c.name for c in cands]
        self.assertEqual(names, ["structure.jpg", "carton-drug-facts.jpg", "old-carton-DISC.jpg", "carton-front.jpg"])
        # an untitled nested subsection inherits the display-panel section
        front = next(c for c in cands if c.name == "carton-front.jpg")
        self.assertEqual(front.section_code, "51945-4")
        self.assertEqual(front.caption, "Carton Front")
        self.assertEqual(rank_media(cands)[0].name, "carton-front.jpg")
        self.assertEqual(spl_version(root), "7")


class InactiveIngredients(unittest.TestCase):
    def setUp(self):
        self.root = parse_xml(fixture("spl_kit.xml"))

    def test_iact_lists_per_product_in_label_order(self):
        products = product_inactive_lists(self.root)
        self.assertEqual([p.ndc for p in products], ["12345-0678", "12345-0999"])
        gel = products[0]
        # actives excluded, duplicates dropped, order kept, UNII captured
        self.assertEqual([n for n, _ in gel.inactive], ["WATER", "LACTIC ACID, UNSPECIFIED FORM", "METHYLISOTHIAZOLINONE"])
        self.assertEqual(gel.inactive[2][1], "229D0E1QFA")

    def test_section_text_heading_stripped(self):
        self.assertEqual(inactive_section_text(self.root), "water, lactic acid, methylisothiazolinone")

    def test_rows_match_product_ndc_ignoring_zero_padding(self):
        rows, how = rows_for("12345-678", "11111111-2222-3333-4444-555555555555", self.root)
        self.assertEqual(how, "ndc")
        iact = [r for r in rows if r["source"] == "iact"]
        self.assertEqual([r["position"] for r in iact], [1, 2, 3])
        self.assertEqual(iact[0]["raw_name"], "WATER")
        text = [r for r in rows if r["source"] == "section_text"]
        self.assertEqual(len(text), 1)
        self.assertEqual(text[0]["position"], 0)

    def test_ambiguous_kit_without_ndc_match_falls_back_to_section_text(self):
        rows, how = rows_for("99999-001", "11111111-2222-3333-4444-555555555555", self.root)
        self.assertEqual(how, "section")
        self.assertEqual([r["source"] for r in rows], ["section_text"])


if __name__ == "__main__":
    unittest.main()
