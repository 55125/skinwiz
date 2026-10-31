"""Chatterbox Nano via the PyPI chatterbox-tts 0.1.7 Turbo classes (Nano support isn't on PyPI yet).
Nano is Turbo's architecture with a GPT-2-small backbone (768 wide, 12 layers, 12 heads), read off t3_nano_v1.safetensors.
usage: run_nano.py [cond_prompt_len]"""
import sys, copy, soundfile as sf, torch, warnings; warnings.filterwarnings("ignore"); sys.path.insert(0, sys.path[0]); torch.set_num_threads(4)
from pathlib import Path
from common import *
from safetensors.torch import load_file
from transformers import AutoTokenizer
from chatterbox.models.t3.llama_configs import LLAMA_CONFIGS
from chatterbox.models.t3 import T3
from chatterbox.models.t3.modules.t3_config import T3Config
from chatterbox.models.s3gen import S3Gen
from chatterbox.models.voice_encoder import VoiceEncoder
from chatterbox.tts_turbo import ChatterboxTurboTTS, Conditionals
D = Path("/home/michael/.cache/huggingface/hub/models--ResembleAI--chatterbox-nano/snapshots/71ccd1d0081b430592cea481f4307e764e07bc64")
LLAMA_CONFIGS["GPT2_nano"] = dict(copy.deepcopy(LLAMA_CONFIGS["GPT2_medium"]), n_embd=768, hidden_size=768, n_head=12, n_layer=12)
def load():
    ve = VoiceEncoder(); ve.load_state_dict(load_file(D / "ve.safetensors")); ve.eval()
    hp = T3Config(text_tokens_dict_size=50276); hp.llama_config_name = "GPT2_nano"; hp.speech_tokens_dict_size = 6563
    hp.input_pos_emb = None; hp.speech_cond_prompt_len = int(sys.argv[1]) if len(sys.argv) > 1 else 375
    hp.use_perceiver_resampler = False; hp.emotion_adv = False
    t3 = T3(hp); t3.load_state_dict(load_file(D / "t3_nano_v1.safetensors")); del t3.tfmr.wte; t3.eval()
    s3 = S3Gen(meanflow=True); s3.load_state_dict(load_file(D / "s3gen_meanflow.safetensors"), strict=True); s3.eval()
    tok = AutoTokenizer.from_pretrained(D); tok.pad_token = tok.pad_token or tok.eos_token
    conds = Conditionals.load(D / "conds.pt", map_location="cpu") if (D / "conds.pt").exists() else None
    return ChatterboxTurboTTS(t3, s3, ve, tok, "cpu", conds=conds)
with T() as t: m = load()
print(f"loaded {t.s:.0f}s", flush=True)
TAGGED = {"fragrance_1": "Two truths and a lie. [chuckle] I'm in your shampoo. I'm in your detergent. I'm in unscented products.",
          "fragrance_2": "[laugh] ...trick question. They're all true."}
stock = m.conds
for voice in ("stock", "clone"):
    for key, l in LINES.items():
        for tagged in (False, True):
            if tagged and key not in TAGGED: continue
            text = TAGGED[key] if tagged else l["text"]; torch.manual_seed(0)
            with T() as t:
                if voice == "clone": w = m.generate(text, audio_prompt_path=REFS[l["speaker"]]["wav"])
                else: m.conds = stock; w = m.generate(text)
            v = f"clone-{l['speaker']}" if voice == "clone" else "stock-default"; k = key + ("-tags" if tagged else "")
            sf.write(out("chatterbox-nano", v, k), w.squeeze(0).numpy(), m.sr); log("chatterbox-nano", v, k, t.s, w.shape[-1] / m.sr, text if tagged else "")
