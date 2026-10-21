""""Breaking up with ingredients", Parts 1-3: chat-screen reels.

usage: ../.venv/bin/python series_breakup.py [1 2 3]      (default: all three)
"me" is Kokoro (af_heart), the closing narrator is Kokoro (af_bella), and the
ingredient characters are Chatterbox (venv-chatterbox), each one cloned from
its own Kokoro voice sample so the characters sound different. Chatterbox
lines are cached in work/cbx-cache and checked with Whisper; a line that comes
back garbled is re-rendered with a new seed.
"""
import difflib, hashlib, json, os, re, subprocess, sys
import numpy as np, soundfile as sf
from reelkit import *
import chatui

SERIES = "Breaking up with ingredients"
ME, NARRATOR = "af_heart", "af_bella"
# character -> Kokoro voice used as the Chatterbox reference sample
CHARACTERS = {"fragrance": "am_puck", "linalool": "am_michael", "limonene": "af_sarah", "mi": "am_echo"}
EXAGGERATION, CFG = 0.7, 0.3
CTA = "Check before you buy. Free at Actively Skin dot com."

# Beat kinds:
#   ("contact", name, subtitle, colour, initials, [already-visible messages])  switch chat, no time
#   ("me", bubble, spoken)             ("it", bubble, spoken, character)
#   ("emoji", "🍋")                     incoming emoji, no voice
#   ("toast", "X blocked", spoken-by-me or None)
#   ("scan", False|True)               barcode-scan screen: scanning, then the red X
#   ("note", [line, line], spoken)    narrator aside on screen (Kokoro, wry and a touch slower)
#   ("end", subtitle, spoken)
PARTS = {
    1: ("New number, who dis", [
        ("contact", "Fragrance", "ex · goes by many names", (190, 110, 160), "Fr", [("it", "u up? 😘")]),
        ("toast", "Fragrance blocked", "Blocked."),
        ("contact", "Parfum", "new number", (190, 110, 160), "Pa", []),
        ("it", "babe it's me. new number 😘", "Babe. It's me. New number.", "fragrance"),
        ("toast", "Parfum blocked", None),
        ("contact", "Linalool", "new number", (140, 120, 200), "Li", []),
        ("it", "ok that one wasn't me.", "Okay, that one wasn't me.", "fragrance"),
        ("toast", "Linalool blocked", None),
        ("contact", "Limonene", "new number", (222, 176, 30), "Lm", []),
        ("emoji", "🍋"),
        ("me", "I read the WHOLE ingredient list now.", "I read the whole ingredient list now."),
        ("it", "...who taught you that.", "Who taught you that.", "fragrance"),
        ("end", "Fragrance can go by many names on a label.", "Fragrance can go by many names on a label. " + CTA),
    ]),
    2: ("Won't take the hint", [
        ("contact", "Fragrance", "ex · won't take the hint", (190, 110, 160), "Fr", []),
        ("me", "It's over.", "It's over."),
        ("it", "lol ok. see u in ur shampoo tmrw 😘", "Ha. Okay. See you in your shampoo tomorrow.", "fragrance"),
        ("it", "and ur laundry detergent", "And your laundry detergent.", "fragrance"),
        ("it", "and that candle ur aunt got u", "And that candle your aunt got you.", "fragrance"),
        ("scan", False),
        ("scan", True),
        ("it", "...ok that's just rude.", "Okay. That's just rude.", "fragrance"),
        ("end", "Save your avoid list once, then check any product against it.", CTA),
    ]),
    3: ("Breaking up with a preservative", [
        ("contact", "Methylisothiazolinone", "preservative · on your avoid list", (201, 92, 84), "MI", []),
        ("me", "My patch test came back. We're done.", "My patch test came back. We're done."),
        ("it", "lol. you can't even pronounce me.", "Ha. You can't even pronounce me.", "mi"),
        ("me", "Methyl… iso… thia… zoli… whatever. You're on my avoid list.", "Methyl... iso... thia... zoli... whatever. You're on my avoid list."),
        ("it", "...that's actually kind of hot.", "That's... actually kind of hot.", "mi"),
        ("toast", "Methylisothiazolinone blocked", None),
        ("note", ["We can't pronounce it either.", "That's why it's on the list."],
         "We can't pronounce it either. That's why it's on the list."),
        ("end", "Save your avoid list once, then check any product against it.", CTA),
    ]),
}

ROOT = os.path.abspath(os.path.join(HERE, ".."))
ENDCARD = os.path.join(ROOT, "endcard", "endcard.mp4")   # approved HTML end card (branch: marketing/endcard/)
WORK = os.path.join(ROOT, "work", "series-breakup")
CACHE, REFS = os.path.join(WORK, "cbx-cache"), os.path.join(WORK, "cbx-refs")
for p in (CACHE, REFS): os.makedirs(p, exist_ok=True)
REF_TEXT = ("Hey. It's me again. I know, I know, you said you were done, but honestly? "
            "You always come back. Everybody does. Anyway. Call me.")

def ref_for(character):
    path = os.path.join(REFS, f"{CHARACTERS[character]}.wav")
    if not os.path.exists(path): sf.write(path, say(REF_TEXT, CHARACTERS[character]), SR)
    return path

def cbx_path(text, character, seed):
    key = hashlib.sha1(f"{text}|{CHARACTERS[character]}|{EXAGGERATION}|{CFG}|{seed}".encode()).hexdigest()[:16]
    return os.path.join(CACHE, f"{character}-{key}.wav")

_whisper = None
def heard(path):
    global _whisper
    import whisper
    _whisper = _whisper or whisper.load_model("base.en")
    return _whisper.transcribe(path)["text"]

def words(s): return re.sub(r"[^a-z' ]", " ", s.lower()).split()
def match(a, b): return difflib.SequenceMatcher(None, words(a), words(b)).ratio()

def render_chatterbox(lines):
    """lines: {(text, character)}. Renders missing ones, re-rolls garbled ones. Returns {(text, character): path}."""
    chosen, seeds = {}, {k: 0 for k in lines}
    for attempt in range(3):
        todo = [k for k in lines if k not in chosen]
        if not todo: break
        jobs = [{"out": cbx_path(t, c, seeds[(t, c)]), "text": t, "ref": ref_for(c),
                 "exaggeration": EXAGGERATION, "cfg": CFG, "seed": seeds[(t, c)]} for t, c in todo]
        missing = [j for j in jobs if not os.path.exists(j["out"])]
        if missing:
            jf = os.path.join(WORK, "jobs.json"); json.dump(missing, open(jf, "w"))
            subprocess.run([os.path.join(ROOT, "venv-chatterbox", "bin", "python"), os.path.join(HERE, "cbx_say.py"), jf], check=True)
        for (t, c), j in zip(todo, jobs):
            h = heard(j["out"]); score = match(t, h)
            print(f"  check {c}: {t!r} heard {h.strip()!r} ({score:.2f})", flush=True)
            if score >= 0.9 or attempt == 2: chosen[(t, c)] = j["out"]
            else: seeds[(t, c)] += 1
    return chosen

def load_trimmed(path):
    a, sr = sf.read(path, dtype="float32"); a = a if a.ndim == 1 else a.mean(1)
    assert sr == SR, f"{path}: {sr} Hz"
    loud = np.flatnonzero(np.abs(a) > 0.012)
    return a[max(0, loud[0] - 1200): loud[-1] + 1200] if len(loud) else a

def thunk():
    t = np.arange(int(SR * 0.16)) / SR
    return (0.5 * np.sin(2 * np.pi * (170 - 300 * t) * t) * np.exp(-t * 30)).astype(np.float32)

def beep():
    return blip(2100, 0.14, 0.18)

def buzz():
    t = np.arange(int(SR * 0.16)) / SR; sq = 0.16 * np.sign(np.sin(2 * np.pi * 180 * t))
    return np.concatenate([sq, silence(0.07), sq]).astype(np.float32)

def build_part(n, voiced):
    title, beats_spec = PARTS[n]
    work = os.path.join(WORK, f"part-{n}"); os.makedirs(work, exist_ok=True)
    contact, msgs, beats = None, [], []
    for i, b in enumerate(beats_spec, 1):
        kind, png = b[0], os.path.join(work, f"beat-{i:02d}.png")
        if kind == "contact":
            contact, msgs = b[1:5], list(b[5]); continue
        if kind == "me":
            msgs.append(("me", b[1]))
            audio = np.concatenate([blip(1480), silence(0.1), say(b[2], ME), silence(0.35)])
        elif kind == "it":
            msgs.append(("it", b[1]))
            audio = np.concatenate([blip(990), silence(0.1), load_trimmed(voiced[(b[2], b[3])]), silence(0.35)])
        elif kind == "emoji":
            msgs.append(("it", b[1])); audio = np.concatenate([blip(990), silence(0.9)])
        elif kind == "toast":
            audio = np.concatenate([thunk(), silence(0.08)] + ([say(b[2], ME)] if b[2] else []) + [silence(0.45)])
        elif kind == "scan":
            chatui.scan(SERIES, n, title, b[1], png)
            audio = np.concatenate([buzz(), silence(1.2)]) if b[1] else np.concatenate([silence(0.25), beep(), silence(0.45)])
            beats.append({"png": png, "audio": audio, "state": {"kind": "scan", "result": b[1],
                          "flagged": ["Fragrance (Parfum)"] if b[1] else []}}); continue
        elif kind == "note":
            audio = np.concatenate([silence(0.25), say(b[2], NARRATOR, 0.95), silence(0.6)])
            beats.append({"png": beats[-1]["png"], "audio": audio,
                          "state": {"kind": "note", "lines": b[1], "spoken": b[2], "speaker": "narrator (Kokoro af_bella, 0.95x)",
                                    "after": beats[-1]["state"]}}); continue
        elif kind == "end":
            audio = np.concatenate([silence(0.2), say(b[2], NARRATOR), silence(0.7)])
            beats.append({"video": ENDCARD, "min_seconds": 4.0, "audio": audio,
                          "state": {"kind": "end", "spoken": b[2]}}); continue
        toast = b[1] if kind == "toast" else None
        chatui.chat(SERIES, n, title, contact, msgs, toast=toast, path=png)
        state = {"kind": kind, "contact": {"name": contact[0], "subtitle": contact[1],
                 "initials": contact[3], "colour": "#%02x%02x%02x" % contact[2]},
                 "messages": [{"from": w, "text": t} for w, t in msgs], "toast": toast,
                 "new_message": None if kind == "toast" else {"from": msgs[-1][0], "text": msgs[-1][1]},
                 "spoken": b[2] if kind in ("me", "it") or (kind == "toast" and b[2]) else None,
                 "speaker": {"me": "me (Kokoro af_heart)", "it": f"{contact[0]} (Chatterbox, {CHARACTERS.get(b[3], '') if kind == 'it' else ''})"}.get(kind)}
        beats.append({"png": png, "audio": audio, "state": state})
    out = os.path.join(ROOT, "out", f"breakup-part-{n}.mp4")
    build(beats, out, work)
    export_timeline(n, title, beats, out)
    return out

def export_timeline(n, title, beats, mp4):
    """partN-audio.wav (the final normalised track, 48 kHz) and partN-timeline.json (beat timing + screen state)."""
    tl = os.path.join(ROOT, "out", "series-breakup-timeline"); os.makedirs(tl, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp4, "-vn", "-c:a", "pcm_s16le",
                    os.path.join(tl, f"part{n}-audio.wav")], check=True)
    t, rows = 0.0, []
    for i, b in enumerate(beats, 1):
        d = b["frames"] / FPS
        rows.append({"beat": i, "start": round(t, 4), "duration": round(d, 4), "frames": b["frames"], **b["state"]})
        t += d
    meta = {"series": SERIES, "part": n, "title": title, "fps": FPS, "width": W, "height": H,
            "total_seconds": round(t, 4), "audio": f"part{n}-audio.wav",
            "notes": ["Each beat's sound (a ding for a text, a thunk for a block, a beep or buzz for a scan) starts at the beat's start.",
                      "Speech in a text beat starts about 0.19 s in, after the ding; the end card's narration starts 0.2 s in; a note beat's narration starts 0.25 s in and ends with 0.6 s of silence.",
                      "kind 'note' is a narrator aside: show its 'lines' on screen; 'after' is the screen state it follows.",
                      "kind 'end' is the 4 s HTML end card (marketing/endcard/endcard.mp4), with its last frame held if the narration runs longer."],
            "beats": rows}
    json.dump(meta, open(os.path.join(tl, f"part{n}-timeline.json"), "w"), indent=2, ensure_ascii=False)

parts = [int(a) for a in sys.argv[1:]] or sorted(PARTS)
lines = {(b[2], b[3]) for n in parts for b in PARTS[n][1] if b[0] == "it"}
voiced = render_chatterbox(lines)
for n in parts:
    build_part(n, voiced)
