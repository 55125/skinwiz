"""Gemini TTS via the REST API (needs GEMINI_API_KEY). Stock voices only; '-tags' variants add Gemini's style direction and audio tags."""
import os, sys, json, base64, time, urllib.request, wave
sys.path.insert(0, sys.path[0]); from common import *
KEY = os.environ["GEMINI_API_KEY"]
MODELS = [a for a in sys.argv[1:] if a != "--tags-only"] or ["gemini-3.8-flash-tts"]
TAGS_ONLY = "--tags-only" in sys.argv  # 3.8 reads a spoken "Say this like..." direction aloud, so use bracket tags only
VOICE = dict(fragrance="Puck", narrator="Kore")
TAGGED = {"fragrance_1": "Say this like a smug, flirty ex who knows a secret, teasing and playful: Two truths and a lie. [chuckles] I'm in your shampoo. I'm in your detergent. [whispering] I'm in unscented products.",
          "fragrance_2": "Say this smugly, with a little laugh: [laughs] ...trick question. They're all true.",
          "narrator": "Say this warmly and clearly, like a friendly expert giving a useful tip: Read the profile, not just the front of the bottle."}
def tts(model, text, voice):
    body = {"contents": [{"parts": [{"text": text}]}], "generationConfig": {"responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
    req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
    for i in range(4):
        try: d = json.load(urllib.request.urlopen(req, timeout=120)); break
        except urllib.error.HTTPError as e:
            print(model, e.code, e.read()[:300], flush=True)
            if e.code == 429: time.sleep(20 * (i + 1)); continue
            raise
    return base64.b64decode(d["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
TAG_ONLY_TEXT = {"fragrance_1": "[smug] [flirty] Two truths and a lie. [chuckles] I'm in your shampoo. I'm in your detergent. [whispering] I'm in unscented products.",
          "fragrance_2": "[laughs] [smug] ...trick question. They're all true.",
          "narrator": "[warm] [friendly] Read the profile, not just the front of the bottle."}
if TAGS_ONLY: TAGGED = TAG_ONLY_TEXT
for model in MODELS:
    for key, l in LINES.items():
        for tagged in ((True,) if TAGS_ONLY else (False, True)):
            s = l["speaker"]; text = TAGGED[key] if tagged else l["text"]
            with T() as t: pcm = tts(model, text, VOICE[s])
            p = out(model, f"stock-{VOICE[s]}", key + ("-tags" if tagged else ""))
            with wave.open(p, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
            log(model, f"stock-{VOICE[s]}", key + ("-tags" if tagged else ""), t.s, len(pcm) / 48000, text if tagged else "online API")
