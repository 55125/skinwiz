"""Shared bits: lines, refs, timing log. Results append to logs/results.jsonl."""
import json, os, time, resource
B = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L = json.load(open(os.path.join(B, "scripts/lines.json")))
REFS = {k: {"wav": os.path.join(B, v["wav"]), "text": v["text"]} for k, v in L.pop("refs").items()}
LINES = L
def out(model, voice, key): os.makedirs(os.path.join(B, "wav"), exist_ok=True); return os.path.join(B, "wav", f"{model}__{voice}__{key}.wav")
def log(model, voice, key, secs, audio_s, note=""):
    rec = dict(model=model, voice=voice, line=key, secs=round(secs, 1), audio_s=round(audio_s, 2), rtf=round(secs / max(audio_s, 1e-3), 2),
               peak_rss_mb=round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024), note=note)
    print(json.dumps(rec), flush=True)
    with open(os.path.join(B, "logs/results.jsonl"), "a") as f: f.write(json.dumps(rec) + "\n")
class T:
    def __enter__(self): self.t = time.time(); return self
    def __exit__(self, *a): self.s = time.time() - self.t
