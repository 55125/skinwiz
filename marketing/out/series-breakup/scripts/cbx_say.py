"""Run inside venv-chatterbox. Renders a batch of lines with one model load.
usage: venv-chatterbox/bin/python cbx_say.py jobs.json
jobs: [{"out", "text", "ref" (voice sample wav), "exaggeration", "cfg", "seed"}]
"""
import json, sys, time, warnings
warnings.filterwarnings("ignore")
import torch, torchaudio
torch.set_num_threads(4)
from chatterbox.tts import ChatterboxTTS
jobs = json.load(open(sys.argv[1]))
t0 = time.time(); model = ChatterboxTTS.from_pretrained(device="cpu"); print(f"chatterbox loaded in {time.time() - t0:.0f}s", flush=True)
for j in jobs:
    t0 = time.time(); torch.manual_seed(j.get("seed", 0))
    wav = model.generate(j["text"], audio_prompt_path=j["ref"], exaggeration=j.get("exaggeration", 0.7), cfg_weight=j.get("cfg", 0.3))
    torchaudio.save(j["out"], wav, model.sr)
    print(f"  {j['text'][:50]!r}: {wav.shape[-1] / model.sr:.2f}s audio, {time.time() - t0:.0f}s", flush=True)
