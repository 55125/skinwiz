"""Unit tests for pet_parse.py (pet catalog scope, species, concerns,
regulatory status). Run from tools/catalog_pipeline:

    python3 -m unittest discover -s tests
"""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pet_parse import is_pet_product, is_skin_product, parse_species, pet_concerns, regulatory_status  # noqa: E402


class SkinScope(unittest.TestCase):
    def test_topical_and_otic_routes(self):
        self.assertTrue(is_skin_product("SHAMPOO", ["TOPICAL"]))
        self.assertTrue(is_skin_product("SOLUTION", ["AURICULAR (OTIC)"]))
        self.assertTrue(is_skin_product("SOLUTION", ["TRANSDERMAL"]))  # spot-ons

    def test_never_tablets_or_injections(self):
        self.assertFalse(is_skin_product("TABLET, CHEWABLE", ["ORAL"]))
        self.assertFalse(is_skin_product("INJECTION, SOLUTION", ["TOPICAL"]))
        self.assertFalse(is_skin_product("SOLUTION", ["ORAL"]))

    def test_no_route_falls_back_to_form(self):
        self.assertTrue(is_skin_product("CLOTH", []))
        self.assertFalse(is_skin_product("PASTE", []))


class Species(unittest.TestCase):
    def test_dogs_and_cats(self):
        s = parse_species("Antiseptic Shampoo", "For use on dogs or cats with bacterial or fungal skin infections.")
        self.assertEqual(s["species"], ["cat", "dog"])
        self.assertFalse(s["not_for_cats"])

    def test_do_not_use_on_cats(self):
        s = parse_species("Advantage Multi for Dogs", "For dogs only. Do not use this product on cats. Keep away from cats.")
        self.assertEqual(s["species"], ["dog"])
        self.assertTrue(s["not_for_cats"])

    def test_age_limit_is_not_a_species_ban(self):
        s = parse_species("Flea Spray", "For dogs and cats. Do not use on puppies or kittens under 12 weeks of age.")
        self.assertEqual(s["species"], ["cat", "dog"])

    def test_livestock_pour_on_warning_about_dogs(self):
        s = parse_species("Ivermectin Cattle Pour-On",
                          "Not for use in other species: severe adverse reactions, including fatalities in dogs, may result.")
        self.assertFalse(is_pet_product(s["species"]))

    def test_horse_only_is_out(self):
        s = parse_species("Thrush Relief", "For use on horses' hooves.")
        self.assertEqual(s["species"], ["horse"])
        self.assertFalse(is_pet_product(s["species"]))

    def test_title_species_plus_body(self):
        s = parse_species("Davis Equine Anti-Fungal Shampoo", "May be used on horses, foals, livestock, dogs and puppies.")
        self.assertIn("dog", s["species"])

    def test_pets_without_a_species(self):
        self.assertEqual(parse_species("Pet Wipes", "For pets with itchy skin.")["species"], ["pet"])
        self.assertEqual(parse_species("Pond Fix", "Safe for pets and fish.")["species"], [])


class Concerns(unittest.TestCase):
    def test_actives_and_indications(self):
        self.assertEqual(pet_concerns(["FIPRONIL"], "kills fleas and ticks"), ["pet-fleas-ticks"])
        self.assertEqual(pet_concerns(["MICONAZOLE NITRATE", "CHLORHEXIDINE GLUCONATE"], ""), ["pet-yeast", "pet-bacterial"])
        self.assertEqual(pet_concerns(["HYDROCORTISONE"], "relief of itching and hot spots"), ["pet-itch-allergies", "pet-hot-spots"])

    def test_ear_products_list_under_ears_first(self):
        self.assertEqual(pet_concerns(["KETOCONAZOLE"], "ear cleanser", route_otic=True)[0], "pet-ear-infections")

    def test_nothing_fits(self):
        self.assertEqual(pet_concerns(["FERRIC SUBSULFATE"], "stops bleeding from nail trims"), [])


class Status(unittest.TestCase):
    def test_categories(self):
        self.assertEqual(regulatory_status("NADA"), "fda_approved")
        self.assertEqual(regulatory_status("ANADA"), "fda_approved")
        self.assertEqual(regulatory_status("conditional NADA"), "fda_conditional")
        self.assertEqual(regulatory_status("unapproved drug other"), "unapproved")
        self.assertIsNone(regulatory_status("export only"))


if __name__ == "__main__":
    unittest.main()
