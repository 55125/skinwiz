"""Breakup Part 2 re-voiced with Gemini 3.8 Flash TTS. Same beats, screens and sound effects as series_breakup.py;
writes gem/part2-audio.wav (24 kHz, pre-loudnorm) and gem/part2-timeline.json for html-render/render.js."""
import os, sys, json, base64, time, math, urllib.request, urllib.error, re, difflib
import numpy as np, soundfile as sf
D = os.path.dirname(os.path.abspath(__file__)); G = os.path.join(D, "gem"); os.makedirs(G, exist_ok=True)
SR, FPS = 24000, 30; KEY = os.environ["GEMINI_API_KEY"]; MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-3.8-flash-tts")
VOICE = {"me": "Leda", "fragrance": "Puck", "narrator": "Sulafat"}
# spoken text with Gemini audio tags (3.8 reads plain-English directions aloud, so tags only)
LINES = {  # toned down after Michael's note (less smug, no laughing)
 "b1": ("me", "[calm] [matter-of-fact] It's over."),
 "b2": ("fragrance", "[casual] [unbothered] Ha. Okay. See you in your shampoo tomorrow."),
 "b3": ("fragrance", "[casual] And your laundry detergent."),
 "b4": ("fragrance", "[casual] And that candle your aunt got you."),
 "b7": ("fragrance", "[mildly annoyed] Okay. That's just rude."),
 "b8": ("narrator", "[warm] Fragrance gets around. Check the label before it comes home."),
 "b9": ("narrator", "[warm] Check before you buy. Free at Actively Skin dot com."),
}
# The free tier allows 10 requests a day per model; lines listed here fall back to 3.1 (which follows a spoken direction).
FALLBACK_31 = {"b8": "Say this warmly, a little wry, like a friendly expert: Fragrance gets around. Check the label before it comes home.",
               "b9": "Say this warmly and friendly: Check before you buy. Free at Actively Skin dot com."}
def tts(text, voice, model=None):
    model = model or MODEL
    body = {"contents": [{"parts": [{"text": text}]}], "generationConfig": {"responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
    req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
    for i in range(6):
        try: d = json.load(urllib.request.urlopen(req, timeout=120)); break
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503): print("  retry", e.code, flush=True); time.sleep(15 * (i + 1)); continue
            raise
    pcm = base64.b64decode(d["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
    return np.frombuffer(pcm, "<i2").astype(np.float32) / 32768
def clean(a):
    """Cut 3.8's ~0.13 s end burst (loud noise after the last silent gap), then trim lead/tail silence."""
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
if __name__ == "__main__":
    voiced = {}
    for k, (who, text) in LINES.items():
        p = os.path.join(G, f"{k}-{who}.wav")
        if not os.path.exists(p) or "--redo" in sys.argv and k in sys.argv:
            use31 = "--narrator-31" in sys.argv and k in FALLBACK_31
            a = tts(FALLBACK_31[k], VOICE[who], "gemini-3.1-flash-tts-preview") if use31 else tts(text, VOICE[who])
            sf.write(p, clean(a), SR); print("voiced", k, flush=True)
        voiced[k] = sf.read(p, dtype="float32")[0]
    old = json.load(open(os.path.join(D, "marketing/out/series-breakup/timeline/part2-timeline.json")))
    audio_for = {1: [blip(1480), sil(.1), voiced["b1"], sil(.35)],
                 2: [blip(990), sil(.1), voiced["b2"], sil(.35)], 3: [blip(990), sil(.1), voiced["b3"], sil(.35)],
                 4: [blip(990), sil(.1), voiced["b4"], sil(.35)], 5: [sil(.25), blip(2100, .14, .18), sil(.45)],
                 6: [buzz(), sil(1.2)], 7: [blip(990), sil(.1), voiced["b7"], sil(.35)],
                 8: [sil(.25), voiced["b8"], sil(.6)], 9: [sil(.2), voiced["b9"], sil(.7)]}
    t, chunks, beats = 0.0, [], []
    for b in old["beats"]:
        a = np.concatenate(audio_for[b["beat"]])
        if b["kind"] == "end": a = np.pad(a, (0, max(0, int(SR * 4.0) - len(a))))
        fr = math.ceil(len(a) / SR * FPS); a = np.pad(a, (0, round(fr / FPS * SR) - len(a)))
        nb = {**b, "start": round(t, 4), "duration": round(fr / FPS, 4), "frames": fr}
        if b.get("speaker"): nb["speaker"] = {"me": f"me (Gemini 3.8 {VOICE['me']})"}.get(b["kind"], f"Fragrance (Gemini 3.8 {VOICE['fragrance']})")
        if b["kind"] == "note": nb["speaker"] = f"narrator (Gemini {'3.1' if '--narrator-31' in sys.argv else '3.8'} {VOICE['narrator']})"
        beats.append(nb); chunks.append(a); t += fr / FPS
    audio = np.concatenate(chunks); audio /= max(1.0, np.abs(audio).max() / 0.95)
    sf.write(os.path.join(G, "part2-audio.wav"), audio, SR)
    json.dump({**old, "total_seconds": round(t, 4), "audio": "part2-audio.wav", "beats": beats},
              open(os.path.join(G, "part2-timeline.json"), "w"), indent=2, ensure_ascii=False)
    print(f"total {t:.2f}s (was {old['total_seconds']:.2f}s)")
