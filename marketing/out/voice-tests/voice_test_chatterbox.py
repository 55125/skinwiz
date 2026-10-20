import time, sys, warnings, torch, torchaudio
warnings.filterwarnings("ignore")
torch.set_num_threads(4)
from chatterbox.tts import ChatterboxTTS
t0 = time.time(); model = ChatterboxTTS.from_pretrained(device="cpu"); print(f"load {time.time()-t0:.1f}s", flush=True)
LINES = [("smug-flirty", "Babe. It's me. New number.", 0.7, 0.3),
         ("exasperated", "I read the whole ingredient list now.", 0.7, 0.4)]
for name, text, ex, cfg in LINES:
    t0 = time.time()
    wav = model.generate(text, exaggeration=ex, cfg_weight=cfg)
    dt = time.time() - t0; secs = wav.shape[-1] / model.sr
    torchaudio.save(f"out/voice-tests/chatterbox-{name}.wav", wav, model.sr)
    print(f"{name}: {secs:.2f}s audio in {dt:.1f}s compute = {dt/secs:.1f}x real time", flush=True)
