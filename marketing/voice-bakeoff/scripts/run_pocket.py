import sys, soundfile as sf, torch, warnings; warnings.filterwarnings("ignore"); sys.path.insert(0, sys.path[0])
from common import *
from pocket_tts.models.tts_model import TTSModel
STOCK = dict(fragrance="marius", narrator="alba")
for lang in sys.argv[1:] or ["english"]:
    with T() as t: m = TTSModel.load_model(language=lang)
    print(f"{lang} loaded {t.s:.0f}s", flush=True)
    name = "pocket-tts" + ("" if lang == "english" else "-" + lang)
    for voice in ("clone", "stock"):
        try: states = {s: m.get_state_for_audio_prompt(REFS[s]["wav"] if voice == "clone" else STOCK[s]) for s in REFS}
        except ValueError as e: print(f"skip {voice}: cloning weights are gated on Hugging Face", flush=True); continue
        for key, l in LINES.items():
            s = l["speaker"]; torch.manual_seed(0)
            with T() as t: a = m.generate_audio(states[s], l["text"])
            v = f"clone-{s}" if voice == "clone" else f"stock-{STOCK[s]}"
            sf.write(out(name, v, key), a.numpy(), m.sample_rate); log(name, v, key, t.s, a.shape[-1] / m.sample_rate)
