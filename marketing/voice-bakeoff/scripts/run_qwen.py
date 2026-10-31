"""usage: run_qwen.py custom|clone  (CustomVoice 1.7B: stock speakers + instruct; Base 0.6B: cloning)"""
import sys, soundfile as sf, torch, warnings; warnings.filterwarnings("ignore"); sys.path.insert(0, sys.path[0]); torch.set_num_threads(4)
from common import *
from qwen_tts import Qwen3TTSModel
mode = sys.argv[1]
repo = "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice" if mode == "custom" else "Qwen/Qwen3-TTS-12Hz-0.6B-Base"
with T() as t: m = Qwen3TTSModel.from_pretrained(repo, device_map="cpu", dtype=torch.float32)
print(f"loaded {t.s:.0f}s", flush=True)
INSTRUCT = dict(fragrance="Smug, flirty and teasing, like a charming ex who knows a secret; playful and a little smug.",
                narrator="Warm, calm and clear, a friendly expert giving a useful tip.")
name = "qwen3-tts-1.7b-customvoice" if mode == "custom" else "qwen3-tts-0.6b-base"
if mode == "custom":
    print("speakers:", m.get_supported_speakers(), flush=True)
    STOCK = dict(fragrance=sys.argv[2] if len(sys.argv) > 2 else "Ryan", narrator=sys.argv[3] if len(sys.argv) > 3 else "Serena")
for key, l in LINES.items():
    s = l["speaker"]
    for instr in ((None, INSTRUCT[s]) if mode == "custom" else (None,)):
        torch.manual_seed(0)
        with T() as t:
            if mode == "custom": w, sr = m.generate_custom_voice(l["text"], speaker=STOCK[s], language="English", instruct=instr)
            else: w, sr = m.generate_voice_clone(l["text"], language="English", ref_audio=REFS[s]["wav"], ref_text=REFS[s]["text"])
        v = f"stock-{STOCK[s]}" if mode == "custom" else f"clone-{s}"; k = key + ("-instruct" if instr else "")
        sf.write(out(name, v, k), w[0], sr); log(name, v, k, t.s, len(w[0]) / sr, instr or "")
