import sys, soundfile as sf, numpy as np, torch; sys.path.insert(0, sys.path[0]); torch.set_num_threads(4)
from common import *
from kokoro import KPipeline
p = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
say = lambda t, v: np.concatenate([np.asarray(a) for _, _, a in p(t, voice=v)])
sf.write(REFS["narrator"]["wav"], say(REFS["narrator"]["text"], "af_bella"), 24000)
for key, l in LINES.items():
    v = "am_puck" if l["speaker"] == "fragrance" else "af_bella"
    with T() as t: a = say(l["text"], v)
    sf.write(out("kokoro", v, key), a, 24000); log("kokoro", v, key, t.s, len(a) / 24000)
