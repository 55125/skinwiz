"""usage: make_listen.py OUTDIR  (OUTDIR holds template.html and a/*.mp3; writes swipe-left-voices.html)"""
import json, sys, html, collections, os
S = sys.argv[1]; B = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rows = [json.loads(l) for l in open(os.path.join(B, "logs/results.jsonl"))]
L = json.load(open(os.path.join(B, "scripts/lines.json")))
RAM = {"kokoro":1.5,"chatterbox":6.4,"chatterbox-turbo":6.0,"pocket-tts":1.0,"pocket-tts-english_drifting_26-09":1.0,"pocket-tts-english_18m_2026-10":0.6,"kitten-tts-2":6.2,"qwen3-tts-1.7b-customvoice":9.9,"qwen3-tts-0.6b-base":5.8}
RAM.update(json.load(open(os.path.join(B, "logs/ram_extra.json"))) if os.path.exists(os.path.join(B, "logs/ram_extra.json")) else {})
NAME = {"kokoro":"Kokoro 82M","chatterbox":"Chatterbox (original)","chatterbox-turbo":"Chatterbox Turbo","pocket-tts":"Pocket TTS","pocket-tts-english_drifting_26-09":"Pocket TTS · Sep model","pocket-tts-english_18m_2026-10":"Pocket TTS · 18M","kitten-tts-2":"Kitten TTS 2","qwen3-tts-1.7b-customvoice":"Qwen3-TTS 1.7B CustomVoice","qwen3-tts-0.6b-base":"Qwen3-TTS 0.6B Base","voxcpm2":"VoxCPM2 (Q8, CPU)"}
BASE = {"kokoro","chatterbox"}; ORDER = list(NAME)
SP = os.path.join(B, "logs/scores.json"); SC = json.load(open(SP)) if os.path.exists(SP) else {}
def voice_label(v):
    if v.startswith("clone-"): return "cloned from our " + ("Fragrance (am_puck)" if v.endswith("fragrance") else "narrator (af_bella)")
    if v.startswith("stock-"): return "stock: " + v[6:]
    if v.startswith("design-"): return "voice designed from a text description"
    return "Kokoro voice " + v
groups = collections.OrderedDict((k, []) for k in ["fragrance_1","fragrance_2","narrator"])
for r in rows:
    base, _, variant = r["line"].partition("-"); groups[base].append((r, variant))
title = {"fragrance_1":"Fragrance, line 1","fragrance_2":"Fragrance, line 2","narrator":"Narrator"}
out = []
for g, items in groups.items():
    items.sort(key=lambda x: (ORDER.index(x[0]["model"]), x[0]["voice"], x[1]))
    trs = []
    for r, variant in items:
        f = f'a/{r["model"]}__{r["voice"]}__{r["line"]}.mp3'
        tag = {"tags":"with tags","instruct":"with tone instruction","style":"with style prompt"}.get(variant, "")
        note = html.escape(r["note"]) if variant else ""
        speed = "faster than real time" if r["rtf"] < 1 else f'{r["rtf"]:.0f}× slower than real time' if r["rtf"] >= 1.5 else "about real time"
        base = r['model'] in BASE
        sc = SC.get(f'{r["model"]}__{r["voice"]}__{r["line"]}.wav')
        heard = f'<div class="heard{" off" if sc["match"] < 0.9 else ""}">Whisper heard: “{html.escape(sc["heard"])}”</div>' if sc else ""
        trs.append(f'''<li class="take{' base' if base else ''}">
 <div class="who"><span class="model">{NAME[r['model']]}</span>{'<span class="chip">baseline</span>' if base else ''}{f'<span class="chip alt">{tag}</span>' if tag else ''}
 <span class="voice">{voice_label(r['voice'])}</span>{f'<span class="note">{note}</span>' if note else ''}</div>
 <audio controls preload="none" src="{f}"></audio>
 <div class="nums"><span><b>{r['secs']:.1f}s</b> to make</span><span>{r['audio_s']:.1f}s audio</span><span class="{'fast' if r['rtf']<1 else ''}">{speed}</span><span>{RAM[r['model']]} GB RAM</span></div>{heard}
</li>''')
    out.append(f'<section><h2>{title[g]}</h2><p class="line">“{html.escape(L[g]["text"])}”</p><ul>{"".join(trs)}</ul></section>')
open(os.path.join(S, "swipe-left-voices.html"), "w").write(open(os.path.join(S, "template.html")).read().replace("<!--SECTIONS-->", "\n".join(out)))
print(len(rows), "takes")
