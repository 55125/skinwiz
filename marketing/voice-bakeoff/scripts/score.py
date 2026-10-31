"""Whisper base.en transcript of every WAV vs its script line (same check as the breakup series). Writes logs/scores.json."""
import os, re, sys, json, difflib, warnings; warnings.filterwarnings("ignore"); sys.path.insert(0, sys.path[0])
from common import B, LINES
import whisper
m = whisper.load_model("base.en")
words = lambda s: re.sub(r"[^a-z' ]", " ", s.lower()).split()
tags = lambda s: re.sub(r"\[[a-z]+\]|<[a-z]+>|[()]", " ", s)
scores = {}
for f in sorted(os.listdir(os.path.join(B, "wav"))):
    key = f[:-4].split("__")[2].split("-")[0]
    heard = m.transcribe(os.path.join(B, "wav", f))["text"].strip()
    scores[f] = dict(match=round(difflib.SequenceMatcher(None, words(LINES[key]["text"]), words(tags(heard))).ratio(), 2), heard=heard)
    print(f, scores[f], flush=True)
json.dump(scores, open(os.path.join(B, "logs/scores.json"), "w"), indent=1)
