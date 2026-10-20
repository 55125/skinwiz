"""Reel A: "It's not you, it's me" — a breakup text to an avoid-list ingredient.
usage: ../.venv/bin/python breakup.py OUT.mp4
"""
import os, sys
from PIL import Image, ImageDraw
from reelkit import *

ME, IT, NARRATOR = "af_heart", "am_puck", "af_heart"
# (who, bubble text, spoken text). who: "me" | "it" | "end"
SCRIPT = [
    ("me", "We need to talk.", "We need to talk."),
    ("it", "Babe, come on. I'm just a preservative.", "Babe, come on. I'm just a preservative."),
    ("me", "My patch test says I'm allergic to you. We're done.", "My patch test says I'm allergic to you. We're done."),
    ("it", "You'll never find me. I hide in the ingredient list.", "You'll never find me. I hide in the ingredient list."),
    ("me", "I read the ingredient list now.", "I read the ingredient list now."),
    ("it", "...who taught you that?", "Who taught you that?"),
    ("end", None, "Save your avoid list. Check before you buy. Free at Actively Skin dot com."),
]
CONTACT, CONTACT_SUB = "Methylisothiazolinone", "preservative · on your avoid list"
HOOK = "POV: your patch test\nresults came back"

out = sys.argv[1] if len(sys.argv) > 1 else "../out/breakup-reel.mp4"
work = os.path.join(HERE, "..", "work", "breakup"); os.makedirs(work, exist_ok=True)
BG, CARD, BUBBLE_IT = (232, 227, 217), (252, 251, 249), (233, 233, 236)
F_MSG, F_HOOK = font("regular", 46), font("black", 58)

def chat_frame(n, path):
    img = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(img)
    y = 110
    for ln in wrap(d, HOOK, F_HOOK, 940):
        d.text((W // 2, y), ln, font=F_HOOK, fill=INK, anchor="mt"); y += 70
    top = y + 40
    d.rounded_rectangle((60, top, W - 60, 1620), 48, fill=CARD)
    # header: avatar, contact name, a broken-heart-ish divider line
    d.ellipse((100, top + 40, 196, top + 136), fill=(201, 92, 84))
    d.text((148, top + 88), "MI", font=font("black", 40), fill="white", anchor="mm")
    d.text((222, top + 52), CONTACT, font=font("bold", 44), fill=INK)
    d.text((222, top + 106), CONTACT_SUB, font=font("regular", 30), fill=GREY)
    d.line((60, top + 172, W - 60, top + 172), fill=(225, 222, 216), width=3)
    y = top + 210
    for who, text, _ in SCRIPT[:n]:
        lines = wrap(d, text, F_MSG, 600)
        tw = max(d.textlength(l, font=F_MSG) for l in lines)
        bh = 58 * len(lines) + 40
        x0 = W - 100 - tw - 56 if who == "me" else 100
        d.rounded_rectangle((x0, y, x0 + tw + 56, y + bh), 36, fill=TEAL if who == "me" else BUBBLE_IT)
        for k, l in enumerate(lines):
            d.text((x0 + 28, y + 22 + 58 * k), l, font=F_MSG, fill="white" if who == "me" else INK)
        y += bh + 26
    img.save(path); return path

beats = []
for i, (who, text, spoken) in enumerate(SCRIPT, 1):
    if who == "end":
        png = end_card(os.path.join(work, "end.png"), sub="Save your avoid list once, then check any product against it.")
        audio = silence(0.2); audio = np.concatenate([audio, say(spoken, NARRATOR), silence(1.0)])
    else:
        png = chat_frame(i, os.path.join(work, f"frame-{i:02d}.png"))
        voice = say(spoken, ME if who == "me" else IT, 1.0 if who == "me" else 1.05)
        audio = np.concatenate([blip(1480 if who == "me" else 990), silence(0.12), voice, silence(0.4)])
    beats.append({"png": png, "audio": audio})
build(beats, out, work)
