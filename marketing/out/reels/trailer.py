"""Reel B: an ingredient label, recut as a movie trailer.
usage: ../.venv/bin/python trailer.py OUT.mp4
The ingredient list is generic (no brand) and only label facts are stated.
"""
import os, sys
from PIL import Image, ImageDraw
from reelkit import *

TRAILER, NARRATOR = "am_onyx", "af_heart"   # am_onyx measured the deepest Kokoro voice (~86 Hz)
# (card text, spoken text, boom?)
BEATS = [
    ("IN A WORLD...", "In a world...", True),
    ("WHERE FRAGRANCE\nGOES BY\nMANY NAMES", "where fragrance goes by many names...", True),
    ("ONE SHOPPER\nREADS EVERY\nLAST LINE", "one shopper... reads every last line.", True),
    ("STARRING", "Starring... Parfum. Linalool. And Limonene.", True),
    ("COMING SOON\nTO A LABEL\nNEAR YOU", "Coming soon, to a label near you.", False),
]
INGREDIENTS = """Aqua (Water), Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Dimethicone,
Butyrospermum Parkii (Shea) Butter, Glyceryl Stearate, PEG-100 Stearate, Cetyl Alcohol, Petrolatum,
Isopropyl Myristate, Tocopheryl Acetate, Panthenol, Allantoin, Sodium Hyaluronate, Niacinamide, Ceramide NP,
Cholesterol, Squalane, Stearic Acid, Behenyl Alcohol, Carbomer, Sodium Hydroxide, Xanthan Gum,
Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Polysorbate 60, Sorbitan Stearate, Butylene Glycol,
Propanediol, Pentylene Glycol, Caprylyl Glycol, Hydroxyacetophenone, Phenoxyethanol, Ethylhexylglycerin,
Disodium EDTA, Citric Acid, Sodium Citrate, Benzyl Alcohol, Parfum (Fragrance), Linalool, Limonene,
Citronellol, Geraniol, Hexyl Cinnamal, Coumarin, Benzyl Salicylate""".replace("\n", " ").split(", ")
STARS = ("PARFUM", "LINALOOL", "LIMONENE")

out = sys.argv[1] if len(sys.argv) > 1 else "../out/trailer-reel.mp4"
work = os.path.join(HERE, "..", "work", "trailer"); os.makedirs(work, exist_ok=True)
F_CARD, F_LIST = font("serif", 104), font("regular", 44)
GOLD = (226, 196, 140)

# tall scrolling ingredient list; the fragrance names are highlighted
lh = 76
tall = Image.new("RGBA", (W, H + lh * len(INGREDIENTS) + H), (0, 0, 0, 0)); d = ImageDraw.Draw(tall)
for k, name in enumerate(INGREDIENTS):
    hot = name.split(" (")[0].upper() in STARS
    d.text((W // 2, H + k * lh), name, font=font("bold" if hot else "regular", 46 if hot else 44),
           fill=GOLD if hot else (235, 235, 235), anchor="mt")
tall_path = os.path.join(work, "ingredients.png"); tall.save(tall_path)

def card(text, path, stars=False):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    # dark band behind the title so it reads over the list
    d.rectangle((0, 560, W, 1300), fill=(11, 11, 12, 215))
    lines = text.split("\n")
    if stars:
        d.text((W // 2, 640), text, font=font("serif", 64), fill=(200, 200, 200), anchor="mt")
        for k, s in enumerate(STARS):
            d.text((W // 2, 780 + k * 150), s, font=F_CARD, fill=GOLD, anchor="mt")
    else:
        y = 930 - 64 * len(lines)
        for ln in lines:
            d.text((W // 2, y), ln, font=F_CARD, fill="white", anchor="mt"); y += 128
    img.save(path); return path

beats = []
for i, (text, spoken, hit) in enumerate(BEATS, 1):
    voice = reverb(say(spoken, TRAILER, 0.86))
    audio = np.concatenate([silence(0.15), voice, silence(0.4)])
    if hit:
        audio = mix(audio, boom(), 0.0)
    png = card(text, os.path.join(work, f"card-{i:02d}.png"), stars=(text == "STARRING"))
    beats.append({"png": png, "audio": audio, "scroll": True})
end = end_card(os.path.join(work, "end.png"), sub="Fragrance can hide under many names. Read the full ingredient list.")
beats.append({"png": end, "audio": np.concatenate([silence(0.2), say("Check before you buy. Free at Actively Skin dot com.", NARRATOR), silence(0.7)])})
build(beats, out, work, scroll={"png": tall_path, "alpha": 0.42, "y0": 0, "y1": tall.height - H})
