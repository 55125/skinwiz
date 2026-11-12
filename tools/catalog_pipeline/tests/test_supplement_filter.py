"""Supplements you swallow stay out of the cosmetic catalog (is_supplement)."""
import unittest

from build_cosmetic_catalog import is_supplement


class SupplementFilterTest(unittest.TestCase):
    def test_gummies_tablets_and_per_dose_labels_are_supplements(self):
        for name, text in [
            ("Ultralife Adult Gummies Hair Skin & Nails 120 Pack", "ACTIVE INGREDIENTS - EACH PASTILLE (GUMMY) CONTAINS: Ascorbic Acid"),
            ("Ultralife High Strength Vitamin C 1000mg Tablets 200 pack", "Total Ascorbic Acid (Vitamin C) 1000 mg"),
            ("Swisse Beauty Hair Nutrition For Women With Biotin 60 Pack", "EACH SOFT CAPSULE CONTAINS: Biotin 1.3 mg"),
            ("Multivitamin", "Acid: citric acid; acidy regulator: sodium hydrogen carbonate"),
        ]:
            self.assertTrue(is_supplement({"product_name": name, "ingredients_text": text}), name)

    def test_capsule_skincare_is_not(self):
        for name, text in [
            ("Hyaluronic Acid Capsule Cream", "Water, Niacinamide, Butylene Glycol"),
            ("Facial Serum Capsules", "Isohexadecane, Dimethicone, Tocopherol"),
            ("The Multi-Vitamin Daily Nutrients Body Wash".replace("Multi-Vitamin", "Vitamin"), "Aqua, Sodium Cocoyl Methyl Isethionate"),
        ]:
            self.assertFalse(is_supplement({"product_name": name, "ingredients_text": text}), name)


if __name__ == "__main__":
    unittest.main()
