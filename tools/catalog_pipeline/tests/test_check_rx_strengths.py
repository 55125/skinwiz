"""Unit tests for check_rx_strengths.py's correction rules. Run from
tools/catalog_pipeline:

    python3 -m unittest discover -s tests
"""
from __future__ import annotations

import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

import check_rx_strengths as c  # noqa: E402


class DecideTest(unittest.TestCase):
    def test_unit_slip_confirmed_by_label(self):
        # Clobetasol spray keyed ".05 g/mL" (5%); approved 0.05%, label says 0.05%.
        self.assertEqual(c.decide([5.0], ["CLOBETASOL PROPIONATE"], [[0.05]], {0.05}, {}), ([0.05], "Orange Book + label text"))

    def test_slip_alone_only_when_listed_strength_is_approved_nowhere(self):
        self.assertEqual(c.decide([5.0], ["CLOBETASOL PROPIONATE"], [[0.05]], set(), {"clobetasol": {0.05}}), ([0.05], "Orange Book"))
        # 0.5% fluorouracil exists (Carac), so 0.5 -> 5 needs the label text.
        self.assertEqual(c.decide([0.5], ["FLUOROURACIL"], [[5.0]], set(), {"fluorouracil": {0.5, 5.0}}), ([], ""))
        self.assertEqual(c.decide([0.5], ["FLUOROURACIL"], [[5.0]], {5.0}, {"fluorouracil": {0.5, 5.0}}), ([5.0], "Orange Book + label text"))

    def test_strict_tolerance_keeps_one_slip(self):
        # 0.25 x 10 = 2.5 only, never also 3.75.
        self.assertEqual(c.decide([0.25], ["IMIQUIMOD"], [[2.5], [3.75]], {2.5}, {"imiquimod": {2.5, 3.75}}), ([2.5], "Orange Book + label text"))

    def test_label_text_alone_when_no_slip_explains_it(self):
        # Metronidazole "10 mg/60g" = 0.0167% on a 1% gel.
        self.assertEqual(c.decide([0.0167], ["METRONIDAZOLE"], [[1.0]], {1.0}, {"metronidazole": {1.0}}), ([1.0], "label text + Orange Book"))

    def test_unverified_when_nothing_confirms(self):
        self.assertEqual(c.decide([0.0167], ["METRONIDAZOLE"], [[1.0]], {0.75}, {"metronidazole": {1.0}}), ([], ""))
        # Two approved strengths on the label and no slip: ambiguous.
        self.assertEqual(c.decide([0.3], ["X"], [[1.0], [2.0]], {1.0, 2.0}, {}), ([], ""))

    def test_different_number_of_actives_is_never_corrected(self):
        self.assertEqual(c.decide([0.35, 0.025], ["NEOMYCIN SULFATE", "FLUOCINOLONE ACETONIDE"], [[0.025]], {0.025}, {}), ([], ""))

    def test_combo_kept_in_label_order(self):
        # Calcipotriene 0.005% + betamethasone keyed 50 mg/g (5%); approved 0.064% + 0.005%.
        fix, _ = c.decide([0.005, 5.0], ["CALCIPOTRIENE", "BETAMETHASONE DIPROPIONATE"], [[0.064, 0.005]], {0.005, 0.064}, {})
        self.assertEqual(c.in_label_order([0.005, 5.0], fix), [0.005, 0.064])

    def test_salt_factor_counts_as_match(self):
        self.assertTrue(c.matches([1.2], [1.0]))
        self.assertFalse(c.matches([1.2], [1.0], strict=True))


if __name__ == "__main__":
    unittest.main()
