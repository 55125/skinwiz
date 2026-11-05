"""Breakup Part 1 re-voiced for the ad test: same beats and screens as the October cut, Gemini voices to match the
Unscented reel. Writes <engine>/audio.wav and <engine>/timeline.json for html-render/render.js. Re-running only voices
lines with no cached WAV, so a free-tier limit can be finished after the daily reset. Default engine is Kokoro,
used to check the build; --engine gemini needs GEMINI_API_KEY."""
import os, sys, json, base64, time, math, urllib.request, urllib.error
import numpy as np, soundfile as sf
D = os.path.dirname(os.path.abspath(__file__))
ENGINE = sys.argv[sys.argv.index("--engine") + 1] if "--engine" in sys.argv else "kokoro"
G = os.path.join(D, ENGINE); os.makedirs(G, exist_ok=True)
SR, FPS = 24000, 30; MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-3.8-flash-lite-tts")
GEMINI_VOICE = {"me": "Leda", "fragrance": "Puck", "narrator": "Sulafat"}
KOKORO_VOICE = {"me": "af_heart", "fragrance": "am_puck", "narrator": "af_bella"}
# beat: (speaker, Gemini tags, spoken text). Every texter is the same ex in one voice, per Michael's note on Part 1.
LINES = {
 1: ("fragrance", "[casual] [unbothered]", "You up?"),
 2: ("me", "[flat] [matter-of-fact]", "Blocked."),
 3: ("fragrance", "[casual]", "Babe. It's me. New number."),
 5: ("fragrance", "[casual] [unbothered]", "Okay, that one wasn't me."),
 8: ("me", "[calm] [matter-of-fact]", "I read the whole ingredient list now."),
 9: ("fragrance", "[mildly annoyed]", "Who taught you that."),
 10: ("narrator", "[warm]", "Fragrance goes by many names. Your avoid list should know all of them."),
 11: ("narrator", "[warm]", "Check before you buy. Free at Actively Skin dot com."),
}
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
def blip(freq=990, dur=0.09, vol=0.22):
    t = np.arange(int(SR * dur)) / SR; return (vol * np.sin(2 * np.pi * freq * t) * np.exp(-t * 40)).astype(np.float32)
def thunk():
    t = np.arange(int(SR * 0.22)) / SR; return (0.5 * np.sin(2 * np.pi * 95 * t) * np.exp(-t * 18)).astype(np.float32)
if __name__ == "__main__":
    voiced = {}
    for k, (who, tags, text) in LINES.items():
        p = os.path.join(G, f"b{k}-{who}.wav")
        if not os.path.exists(p) or ("--redo" in sys.argv and f"b{k}" in sys.argv):
            a = gemini(f"{tags} {text}", GEMINI_VOICE[who]) if ENGINE == "gemini" else kokoro(text, KOKORO_VOICE[who])
            sf.write(p, clean(a), SR); print("voiced", k, flush=True)
        voiced[k] = sf.read(p, dtype="float32")[0]
    old = json.load(open(os.path.join(D, "part1-timeline-original.json")))
    # Beat 1 holds at least 1.3 s so "u up?" lands before the block, per Michael's note on the October cut.
    audio_for = {1: [blip(), sil(.1), voiced[1], sil(.45)], 2: [thunk(), sil(.08), voiced[2], sil(.35)],
                 3: [blip(), sil(.1), voiced[3], sil(.25)], 4: [thunk(), sil(.4)],
                 5: [blip(), sil(.1), voiced[5], sil(.25)], 6: [thunk(), sil(.4)], 7: [blip(), sil(.85)],
                 8: [blip(1480), sil(.1), voiced[8], sil(.25)], 9: [blip(), sil(.1), voiced[9], sil(.25)],
                 10: [sil(.25), voiced[10], sil(.5)], 11: [sil(.2), voiced[11], sil(.7)]}
    t, chunks, beats = 0.0, [], []
    for b in old["beats"]:
        a = np.concatenate(audio_for[b["beat"]])
        if b["beat"] == 1: a = np.pad(a, (0, max(0, int(SR * 1.3) - len(a))))
        if b["kind"] == "end": a = np.pad(a, (0, max(0, int(SR * 4.0) - len(a))))
        fr = math.ceil(len(a) / SR * FPS); a = np.pad(a, (0, round(fr / FPS * SR) - len(a)))
        beats.append({**b, "start": round(t, 4), "duration": round(fr / FPS, 4), "frames": fr}); chunks.append(a); t += fr / FPS
    audio = np.concatenate(chunks); audio /= max(1.0, np.abs(audio).max() / 0.95)
    sf.write(os.path.join(G, "audio.wav"), audio, SR)
    json.dump({**old, "total_seconds": round(t, 4), "audio": "audio.wav", "beats": beats},
              open(os.path.join(G, "timeline.json"), "w"), indent=2, ensure_ascii=False)
    print(f"total {t:.2f}s (October cut {old['total_seconds']:.2f}s)")
