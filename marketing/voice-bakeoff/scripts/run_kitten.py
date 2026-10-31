import sys, soundfile as sf, torch, warnings; warnings.filterwarnings("ignore"); sys.path.insert(0, sys.path[0]); torch.set_num_threads(4)
from common import *
from kittenml import KittenTTS
with T() as t: m = KittenTTS("KittenML/kitten-tts-2", device="cpu")
print(f"loaded {t.s:.0f}s; voices: {m.available_voices}; presets: {list(m.decode_presets)}", flush=True)
vs = list(m.available_voices)
STOCK = dict(fragrance=sys.argv[1], narrator=sys.argv[2]) if len(sys.argv) > 2 else dict(fragrance=vs[0], narrator=vs[1])
TAGGED = {"fragrance_1": "[excited] Two truths and a lie. <laugh> I'm in your shampoo. I'm in your detergent. I'm in (((unscented))) products.",
          "fragrance_2": "<giggle> ...trick question. They're all true."}
for voice in ("stock",) if len(sys.argv) > 3 else ("clone", "stock"):
    for key, l in LINES.items():
        for tagged in (False, True):
            if tagged and key not in TAGGED: continue
            s = l["speaker"]; text = TAGGED[key] if tagged else l["text"]
            kw = dict(reference=REFS[s]["wav"], reference_text=REFS[s]["text"]) if voice == "clone" else dict(voice=STOCK[s])
            with T() as t: a = m.generate(text, preset="expressive" if tagged else None, advanced={"seed": 0}, **kw)
            v = f"clone-{s}" if voice == "clone" else f"stock-{STOCK[s]}"; k = key + ("-tags" if tagged else "")
            sf.write(out("kitten-tts-2", v, k), a, m.sample_rate); log("kitten-tts-2", v, k, t.s, len(a) / m.sample_rate, text if tagged else "")
