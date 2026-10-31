import sys, soundfile as sf, torch, warnings; warnings.filterwarnings("ignore"); sys.path.insert(0, sys.path[0]); torch.set_num_threads(4)
from common import *
from chatterbox.tts import ChatterboxTTS
m = ChatterboxTTS.from_pretrained(device="cpu")
for key, l in LINES.items():
    s = l["speaker"]; torch.manual_seed(0)
    with T() as t: w = m.generate(l["text"], audio_prompt_path=REFS[s]["wav"], exaggeration=0.7, cfg_weight=0.3)
    sf.write(out("chatterbox", f"clone-{s}", key), w.squeeze(0).numpy(), m.sr); log("chatterbox", f"clone-{s}", key, t.s, w.shape[-1] / m.sr, "exag 0.7 cfg 0.3 (breakup settings)")
