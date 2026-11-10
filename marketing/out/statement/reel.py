"""'A statement from Fragrance' reel: a celebrity-style apology typed in a notes app. Writes <engine>/audio.wav and
<engine>/timeline.json for html-render/render_notes.js. Default engine is Kokoro for a local preview; --engine gemini is
the final voice set (Fragrance = Puck, me = Leda, narrator = Sulafat) and needs GEMINI_API_KEY. Cached lines are reused."""
import os, sys, json, base64, time, math, urllib.request, urllib.error
import numpy as np, soundfile as sf
D = os.path.dirname(os.path.abspath(__file__))
ENGINE = sys.argv[sys.argv.index("--engine") + 1] if "--engine" in sys.argv else "kokoro"
G = os.path.join(D, ENGINE); os.makedirs(G, exist_ok=True)
SR, FPS = 24000, 30; MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-3.8-flash-lite-tts")
GEMINI_VOICE = {"me": "Leda", "fragrance": "Puck", "narrator": "Sulafat"}
KOKORO_VOICE = {"me": "af_heart", "fragrance": "am_puck", "narrator": "af_bella"}
# (key, kind, speaker, Gemini tags, spoken, on-screen). Fragrance is an out-of-touch celebrity reading a PR-drafted non-apology.
BEATS = [
 ("b1", "notes", "fragrance", "[brisk] [sighs] [rehearsed]", "Hi guys. This is so hard for me to write.", "Hi guys. This is so hard for me to write. 🙏"),
 ("b2", "notes", "fragrance", "[brisk] [rehearsed]", "I'm sorry if anyone felt itchy.", "I'm sorry if anyone *felt* itchy."),
 ("b3", "notes", "fragrance", "[brisk] [rehearsed] [earnest]", "I'm taking a step back from the front of the bottle to focus on my healing.", "I'm taking a step back from the front of the bottle to focus on my healing."),
 ("b4", "notes", "fragrance", "[brisk] [proud]", "Going forward, I'll be going by Parfum. That's growth.", "Going forward, I'll be going by Parfum. That's growth. ✨"),
 ("b5", "notes", "fragrance", "[quickly] [defensive]", "Linalool, Limonene and I are just friends.", "Linalool, Limonene and I are just friends."),
 ("b6", "notes", "fragrance", "[brisk] [rehearsed]", "Please respect my privacy. In the ingredient list.", "Please respect my privacy. In the ingredient list. 🤍"),
 ("b7", "comment", "me", "[flat] [deadpan]", "Ratio. You're on my avoid list.", "ratio + you're on my avoid list"),
 ("b8", "note", "narrator", "[warm]", "Same ingredient. New names.", None),
 ("b9", "end", "narrator", "[warm]", "Check before you buy. Free at Actively Skin dot com.", None),
]
NOTE_LINES = ["Same ingredient.<br>New names.", "Add “Fragrance allergens (all)” to catch every one."]
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
    return np.concatenate([np.asarray(a, np.float32) for _, _, a in _kp(text, voice=voice, speed=1.15 if voice == KOKORO_VOICE["fragrance"] else 1.0)])
def clean(a):
    """Cut Gemini 3.8's ~0.13 s end burst (loud noise after the last silent gap), then trim lead/tail silence."""
    n = int(.01 * SR); rms = np.array([np.sqrt((a[i:i+n]**2).mean()) for i in range(0, len(a) - n, n)])
    q = np.flatnonzero(rms < 0.003); q = q[q < len(rms) - 1]
    if len(q) and len(a) - (q.max() + 1) * n < 0.3 * SR: a = a[:(q.max() + 1) * n]
    loud = np.flatnonzero(np.abs(a) > 0.012); a = a[max(0, loud[0] - 1200): loud[-1] + 1200]
    f = int(.015 * SR); a = a.copy(); a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f); return a
def squeeze(a, cap=0.25, quiet=0.02):
    """Shorten pauses and long breaths/sighs: any run quieter than `quiet` RMS (speech is ~0.05-0.2) that lasts longer than
    cap seconds is cut down to cap, keeping half of it on each side, with short fades at the cut."""
    n = int(.01 * SR); rms = np.array([np.sqrt((a[i:i+n]**2).mean()) for i in range(0, len(a) - n, n)])
    out, i, c = [], 0, int(cap * 100)
    while i < len(rms):
        if rms[i] < quiet:
            j = i
            while j < len(rms) and rms[j] < quiet: j += 1
            if j - i > c:
                out.append((i + c // 2) * n); out.append((j - c // 2) * n)
            i = j
        else: i += 1
    if not out: return a
    cuts = [0] + out + [len(a)]; parts = [a[cuts[k]:cuts[k + 1]] for k in range(0, len(cuts), 2)]
    f = int(.005 * SR)
    for q in parts[1:]: q[:f] *= np.linspace(0, 1, f)
    for q in parts[:-1]: q[-f:] *= np.linspace(1, 0, f)
    return np.concatenate(parts)
sil = lambda s: np.zeros(int(SR * s), np.float32)
def tick():  # soft key click under the typing
    t = np.arange(int(SR * 0.02)) / SR; return (0.05 * np.random.default_rng(1).standard_normal(len(t)) * np.exp(-t * 250)).astype(np.float32)
def pop(freq=880, dur=0.12, vol=0.2):
    t = np.arange(int(SR * dur)) / SR; return (vol * np.sin(2 * np.pi * freq * t) * np.exp(-t * 30)).astype(np.float32)
def typing(seconds):
    a = sil(seconds); step = int(SR * 0.07)
    for i in range(0, len(a) - 480, step): a[i:i + 480] += tick()
    return a
if __name__ == "__main__":
    t, chunks, beats = 0.0, [], []
    for i, (k, kind, who, tags, spoken, shown) in enumerate(BEATS, 1):
        p = os.path.join(G, f"{k}-{who}.wav")
        if not os.path.exists(p) or ("--redo" in sys.argv and k in sys.argv):
            a = gemini(f"{tags} {spoken}", GEMINI_VOICE[who]) if ENGINE == "gemini" else kokoro(spoken, KOKORO_VOICE[who])
            sf.write(p, clean(a), SR); print("voiced", k, flush=True)
        v = sf.read(p, dtype="float32")[0]
        if ENGINE == "gemini": v = squeeze(v)  # Gemini leaves long pauses; trim them so the reel stays near 25 s
        nb = {"beat": i, "kind": kind, "spoken": spoken}
        if kind == "notes":  # the line types out in 0.35 s while the voice starts right away; quick pacing per Michael
            ty = typing(0.35); ty = np.pad(ty, (0, max(0, len(v) - len(ty))))
            a = np.concatenate([ty[:len(v)] * 0.6 + v, sil(.04)]); nb.update(text=shown, type_seconds=0.35)
        elif kind == "comment":
            a = np.concatenate([pop(), sil(.1), v, sil(.4)]); nb.update(user="skin_on_strike", text=shown)
        elif kind == "note":
            a = np.concatenate([sil(.2), v, sil(.4)]); nb.update(lines=NOTE_LINES)
        else:
            a = np.concatenate([sil(.15), v, sil(.5)]); a = np.pad(a, (0, max(0, int(SR * 4.0) - len(a))))
        fr = math.ceil(len(a) / SR * FPS); a = np.pad(a, (0, round(fr / FPS * SR) - len(a)))
        nb.update(start=round(t, 4), duration=round(fr / FPS, 4), frames=fr); beats.append(nb); chunks.append(a); t += fr / FPS
    audio = np.concatenate(chunks); audio /= max(1.0, np.abs(audio).max() / 0.95)
    sf.write(os.path.join(G, "audio.wav"), audio, SR)
    json.dump({"title": "A statement from Fragrance", "note_title": "A statement.", "fps": FPS, "width": 1080, "height": 1920,
               "total_seconds": round(t, 4), "audio": "audio.wav", "beats": beats},
              open(os.path.join(G, "timeline.json"), "w"), indent=2, ensure_ascii=False)
    print(f"total {t:.2f}s")
