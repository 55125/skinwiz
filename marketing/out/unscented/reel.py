"""'I'm unscented now' reel, the breakup-series sequel. Writes <engine>/audio.wav (24 kHz, pre-loudnorm) and
<engine>/timeline.json for html-render/render.js. Default engine is Kokoro for a local preview; --engine gemini
is the final voice set (me = Leda, Fragrance = Puck, narrator = Sulafat) and needs GEMINI_API_KEY."""
import os, sys, json, base64, time, math, urllib.request, urllib.error
import numpy as np, soundfile as sf
D = os.path.dirname(os.path.abspath(__file__))
ENGINE = sys.argv[sys.argv.index("--engine") + 1] if "--engine" in sys.argv else "kokoro"
G = os.path.join(D, ENGINE); os.makedirs(G, exist_ok=True)
SR, FPS = 24000, 30; MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-3.8-flash-lite-tts")
GEMINI_VOICE = {"me": "Leda", "fragrance": "Puck", "narrator": "Sulafat"}
KOKORO_VOICE = {"me": "af_heart", "fragrance": "am_puck", "narrator": "af_bella"}
# key: (speaker, Gemini tags, spoken text). Tags stay casual per Michael's note on Part 2 (no laughing, not too smug).
LINES = {
 "b1": ("fragrance", "[casual] [unbothered]", "Babe. I changed. I'm unscented now."),
 "b2": ("me", "[flat] [matter-of-fact]", "You were literally in my shampoo."),
 "b3": ("fragrance", "[casual]", "That never happened."),
 "b4": ("fragrance", "[casual] [unbothered]", "And if it did, you're being too sensitive."),
 "b7": ("fragrance", "[mildly annoyed]", "Okay. That's a masking fragrance. It doesn't count."),
 "b8": ("me", "[calm] [matter-of-fact]", "It's on the label. It counts."),
 "b10": ("narrator", "[warm]", "Unscented isn't the same as fragrance-free. Read the label, not the front."),
 "b11": ("narrator", "[warm]", "Check before you buy. Free at Actively Skin dot com."),
}
CONTACT = {"name": "Fragrance", "subtitle": "ex · won't take the hint", "initials": "Fr", "colour": "#be6ea0"}
TEXTS = {"b1": ("it", "babe. I changed. I'm unscented now 😇"), "b2": ("me", "you were literally in my shampoo"),
         "b3": ("it", "that never happened"), "b4": ("it", "and if it did, you're being too sensitive"),
         "b7": ("it", "...ok that's a MASKING fragrance. it doesn't count"), "b8": ("me", "it's on the label. it counts.")}
def gemini(text, voice):
    body = {"contents": [{"parts": [{"text": text}]}], "generationConfig": {"responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
    req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
        data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": os.environ["GEMINI_API_KEY"]})
    for i in range(6):
        try: d = json.load(urllib.request.urlopen(req, timeout=120)); break
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503): print("  retry", e.code, flush=True); time.sleep(15 * (i + 1)); continue
            raise
    pcm = base64.b64decode(d["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
    return np.frombuffer(pcm, "<i2").astype(np.float32) / 32768
_kp = None
def kokoro(text, voice):
    global _kp
    if _kp is None:
        from kokoro import KPipeline
        _kp = KPipeline(lang_code="a")
    return np.concatenate([np.asarray(a, np.float32) for _, _, a in _kp(text, voice=voice, speed=1.0)])
def clean(a):
    """Cut Gemini 3.8's ~0.13 s end burst (loud noise after the last silent gap), then trim lead/tail silence."""
    n = int(.01 * SR); rms = np.array([np.sqrt((a[i:i+n]**2).mean()) for i in range(0, len(a) - n, n)])
    q = np.flatnonzero(rms < 0.003); q = q[q < len(rms) - 1]
    if len(q) and len(a) - (q.max() + 1) * n < 0.3 * SR: a = a[:(q.max() + 1) * n]
    loud = np.flatnonzero(np.abs(a) > 0.012); a = a[max(0, loud[0] - 1200): loud[-1] + 1200]
    f = int(.015 * SR); a = a.copy(); a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f); return a
sil = lambda s: np.zeros(int(SR * s), np.float32)
def blip(freq=1320, dur=0.09, vol=0.22):
    t = np.arange(int(SR * dur)) / SR; return (vol * np.sin(2 * np.pi * freq * t) * np.exp(-t * 40)).astype(np.float32)
def buzz():
    t = np.arange(int(SR * 0.16)) / SR; sq = 0.16 * np.sign(np.sin(2 * np.pi * 180 * t)); return np.concatenate([sq, sil(0.07), sq]).astype(np.float32)
def thunk():
    t = np.arange(int(SR * 0.22)) / SR; return (0.5 * np.sin(2 * np.pi * 95 * t) * np.exp(-t * 18)).astype(np.float32)
if __name__ == "__main__":
    voiced = {}
    for k, (who, tags, text) in LINES.items():
        p = os.path.join(G, f"{k}-{who}.wav")
        if not os.path.exists(p) or ("--redo" in sys.argv and k in sys.argv):
            a = gemini(f"{tags} {text}", GEMINI_VOICE[who]) if ENGINE == "gemini" else kokoro(text, KOKORO_VOICE[who])
            sf.write(p, clean(a), SR); print("voiced", k, flush=True)
        voiced[k] = sf.read(p, dtype="float32")[0]
    def text_beat(k, gap=.35):
        return [blip(1480 if TEXTS[k][0] == "me" else 990), sil(.1), voiced[k], sil(gap)]
    seq = [("b1", "it"), ("b2", "me"), ("b3", "it"), ("b4", "it"), ("scan0", "scan"), ("scan1", "scan"), ("b7", "it"), ("b8", "me"),
           ("block", "block"), ("b10", "note"), ("b11", "end")]
    t, chunks, beats, msgs = 0.0, [], [], []
    for i, (k, kind) in enumerate(seq, 1):
        nb = {"beat": i, "kind": kind}
        if k in TEXTS:
            m = {"from": TEXTS[k][0], "text": TEXTS[k][1]}; msgs = msgs + [m]
            a = np.concatenate(text_beat(k))
            nb.update(contact=CONTACT, messages=msgs, toast=None, new_message=m, spoken=LINES[k][2])
        elif k == "scan0":
            a = np.concatenate([sil(.25), blip(2100, .14, .18), sil(.45)]); nb.update(result=False, flagged=[], bottle="UNSCENTED")
        elif k == "scan1":
            a = np.concatenate([buzz(), sil(1.4)]); nb.update(result=True, flagged=["Fragrance (Parfum)"], bottle="UNSCENTED")
        elif k == "block":
            a = np.concatenate([thunk(), sil(1.1)]); nb.update(contact=CONTACT, messages=msgs, toast="Fragrance blocked", new_message=None)
        elif kind == "note":
            a = np.concatenate([sil(.25), voiced[k], sil(.6)])
            nb.update(lines=["“Unscented” isn't the same as fragrance-free.", "Read the label, not the front."], spoken=LINES[k][2])
        else:
            a = np.concatenate([sil(.2), voiced[k], sil(.7)]); a = np.pad(a, (0, max(0, int(SR * 4.0) - len(a)))); nb.update(spoken=LINES[k][2])
        fr = math.ceil(len(a) / SR * FPS); a = np.pad(a, (0, round(fr / FPS * SR) - len(a)))
        nb.update(start=round(t, 4), duration=round(fr / FPS, 4), frames=fr)
        beats.append(nb); chunks.append(a); t += fr / FPS
    audio = np.concatenate(chunks); audio /= max(1.0, np.abs(audio).max() / 0.95)
    sf.write(os.path.join(G, "audio.wav"), audio, SR)
    json.dump({"series": "Breaking up with ingredients", "part": 4, "title": "I'm unscented now", "fps": FPS, "width": 1080, "height": 1920,
               "total_seconds": round(t, 4), "audio": "audio.wav", "beats": beats}, open(os.path.join(G, "timeline.json"), "w"), indent=2, ensure_ascii=False)
    print(f"total {t:.2f}s")
