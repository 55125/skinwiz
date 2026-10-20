"""Phone-chat frames for the "Breaking up with ingredients" reels (Pillow)."""
import random
from PIL import Image, ImageDraw, ImageFont
from reelkit import W, H, TEAL, INK, GREY, font, wrap

BG, CARD, BUBBLE_IT, TOAST, RED = (232, 227, 217), (252, 251, 249), (233, 233, 236), (38, 38, 42), (200, 58, 52)
EMOJI_FONT = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", 109)
F_MSG = font("regular", 46)
_emoji_cache = {}

def is_emoji(ch):
    return ord(ch) >= 0x2600 and ch not in "’“”…"

def emoji(ch, size):
    key = (ch, size)
    if key not in _emoji_cache:
        im = Image.new("RGBA", (140, 140), (0, 0, 0, 0))
        ImageDraw.Draw(im).text((0, 0), ch, font=EMOJI_FONT, embedded_color=True)
        im = im.crop(im.getbbox())
        _emoji_cache[key] = im.resize((size, round(im.height * size / im.width)), Image.LANCZOS)
    return _emoji_cache[key]

def runs(s):
    out = []
    for ch in s:
        e = is_emoji(ch)
        if ch == "️": continue
        if out and out[-1][0] == e and not e: out[-1][1] += ch
        else: out.append([e, ch])
    return out

def measure(d, s, fnt):
    return sum(fnt.size * 1.15 if e else d.textlength(t, font=fnt) for e, t in runs(s))

def draw_rich(img, d, x, y, s, fnt, fill):
    for e, t in runs(s):
        if e:
            em = emoji(t, round(fnt.size * 1.05)); img.paste(em, (round(x + 2), round(y + 4)), em); x += fnt.size * 1.15
        else:
            d.text((x, y), t, font=fnt, fill=fill); x += d.textlength(t, font=fnt)

def rich_wrap(d, text, fnt, width):
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if measure(d, trial, fnt) <= width or not line: line = trial
        else: lines.append(line); line = word
    return lines + [line]

def chrome(series, part, title):
    img = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(img)
    d.text((W // 2, 92), series.upper(), font=font("black", 34), fill=TEAL, anchor="mt")
    d.text((W // 2, 146), f"Part {part}: {title}", font=font("black", 58), fill=INK, anchor="mt")
    d.rounded_rectangle((60, 260, W - 60, 1620), 48, fill=CARD)
    return img, d

def header(img, d, name, sub, color, initials=None):
    top = 260
    d.ellipse((100, top + 40, 196, top + 136), fill=color)
    initials = initials or name[:2].title()
    d.text((148, top + 88), initials, font=font("black", 40), fill="white", anchor="mm")
    d.text((222, top + 52), name, font=font("bold", 44), fill=INK)
    d.text((222, top + 106), sub, font=font("regular", 30), fill=GREY)
    d.line((60, top + 172, W - 60, top + 172), fill=(225, 222, 216), width=3)

def chat(series, part, title, contact, messages, toast=None, path=None):
    """contact: (name, subtitle, avatar colour[, initials]). messages: [(who, text)], who = 'me' | 'it'."""
    img, d = chrome(series, part, title)
    header(img, d, *contact)
    y = 470
    for who, text in messages:
        if all(is_emoji(c) or c in " ️" for c in text):  # emoji-only message: big, no bubble
            em = emoji(text.strip()[0], 150)
            x = W - 100 - em.width if who == "me" else 100
            img.paste(em, (x, y), em); y += em.height + 30; continue
        lines = rich_wrap(d, text, F_MSG, 600)
        tw = max(measure(d, l, F_MSG) for l in lines); bh = 58 * len(lines) + 40
        x0 = W - 100 - tw - 56 if who == "me" else 100
        d.rounded_rectangle((x0, y, x0 + tw + 56, y + bh), 36, fill=TEAL if who == "me" else BUBBLE_IT)
        for k, l in enumerate(lines):
            draw_rich(img, d, x0 + 28, y + 22 + 58 * k, l, F_MSG, "white" if who == "me" else INK)
        y += bh + 26
    if toast:
        f = font("bold", 42); label = f"\U0001F6AB  {toast}"
        tw = measure(d, label, f)
        x0, y0 = (W - tw) / 2 - 44, 1430
        d.rounded_rectangle((x0, y0, x0 + tw + 88, y0 + 100), 50, fill=TOAST)
        draw_rich(img, d, x0 + 44, y0 + 26, label, f, "white")
    img.save(path); return path

def scan(series, part, title, result, path, flagged=("Fragrance (Parfum)",)):
    """Barcode-scan mock: camera view of a plain unbranded bottle; result=False shows scanning, True the red X."""
    img, d = chrome(series, part, title)
    d.rounded_rectangle((60, 260, W - 60, 1620), 48, fill=(34, 34, 37))
    d.text((W // 2, 320), "Scan a barcode", font=font("bold", 40), fill="white", anchor="mt")
    # plain bottle, no brand
    d.rounded_rectangle((430, 470, 650, 520), 14, fill=(200, 200, 205))
    d.rounded_rectangle((370, 515, 710, 1150), 70, fill=(236, 233, 226))
    d.text((540, 640), "SHAMPOO", font=font("black", 44), fill=(120, 120, 126), anchor="mt")
    rng = random.Random(7); x = 420
    d.rectangle((410, 900, 670, 1060), fill="white")
    while x < 660:
        w = rng.choice((3, 3, 5, 8)); d.rectangle((x, 915, x + w, 1030), fill=INK); x += w + rng.choice((3, 5, 7))
    for (cx, cy, sx, sy) in ((330, 860, 1, 1), (750, 860, -1, 1), (330, 1100, 1, -1), (750, 1100, -1, -1)):
        d.line((cx, cy, cx + 60 * sx, cy), fill="white", width=8); d.line((cx, cy, cx, cy + 60 * sy), fill="white", width=8)
    if not result:
        d.line((340, 975, 740, 975), fill=RED, width=5)
    else:
        d.rounded_rectangle((100, 1220, W - 100, 1580), 40, fill="white")
        d.ellipse((150, 1280, 270, 1400), fill=RED)
        d.line((182, 1312, 238, 1368), fill="white", width=14); d.line((238, 1312, 182, 1368), fill="white", width=14)
        d.text((300, 1290), "On your avoid list", font=font("black", 54), fill=INK)
        d.text((300, 1362), "Lists: " + ", ".join(flagged), font=font("regular", 36), fill=GREY)
        d.text((150, 1460), "Check another product  ›", font=font("bold", 36), fill=TEAL)
    img.save(path); return path
