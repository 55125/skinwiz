import sys, soundfile as sf, torch, warnings; warnings.filterwarnings("ignore"); sys.path.insert(0, sys.path[0]); torch.set_num_threads(4)
from common import *
from chatterbox.tts_turbo import ChatterboxTurboTTS
with T() as t: m = ChatterboxTurboTTS.from_pretrained("cpu")
print(f"loaded {t.s:.0f}s", flush=True)
TAGGED = {"fragrance_1": "Two truths and a lie. [chuckle] I'm in your shampoo. I'm in your detergent. I'm in unscented products.",
          "fragrance_2": "[laugh] ...trick question. They're all true."}
stock = m.conds
for voice in ("clone", "stock"):
    for key, l in LINES.items():
        for tagged in (False, True):
            if tagged and key not in TAGGED: continue
            text = TAGGED[key] if tagged else l["text"]; torch.manual_seed(0)
            with T() as t:
                if voice == "clone": w = m.generate(text, audio_prompt_path=REFS[l["speaker"]]["wav"])
                else: m.conds = stock; w = m.generate(text)
            v = f"{voice}-{l['speaker']}" if voice == "clone" else "stock-default"
            k = key + ("-tags" if tagged else "")
            sf.write(out("chatterbox-turbo", v, k), w.squeeze(0).numpy(), m.sr); log("chatterbox-turbo", v, k, t.s, w.shape[-1] / m.sr, text if tagged else "")
