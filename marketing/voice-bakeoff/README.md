# Swipe Left voice bake-off (persepolis, CPU only)

Three test lines rendered by each candidate model on persepolis (i7-4600U, 2 cores / 4 threads, 15 GB RAM, no GPU), 2026-10-31.

- `fragrance_1`: "Two truths and a lie. I'm in your shampoo. I'm in your detergent. I'm in unscented products."
- `fragrance_2`: "...trick question. They're all true."
- `narrator`: "Read the profile, not just the front of the bottle."

WAVs are in `wav/`, named `model__voice__line[-variant].wav`:
- `clone-fragrance` is cloned from `refs/fragrance_am_puck.wav`, the Kokoro am_puck clip the breakup series cloned Fragrance from.
- `clone-narrator` is cloned from `refs/narrator_af_bella.wav`.
- `stock-*` is the model's own built-in voice.
- `-tags` uses expression tags (Turbo `[chuckle]`/`[laugh]`; Kitten `[excited]`, `<laugh>`, `<giggle>`, `(((emphasis)))`).
- `-instruct` uses Qwen's tone instruction ("smug, flirty and teasing…" / "warm, calm and clear…").

Timings are seconds of compute per line on 4 threads, with the model already loaded. The CPU sat at 94–96 °C and throttled to about 1.9 GHz for most runs, the same for every model. Peak RAM is the whole process (`/usr/bin/time -v`). "Whisper" is the base.en transcript compared with the script (1.0 = every word right). The full data is in `logs/results.jsonl` and `logs/scores.json`.

| model | license | sec per line (F1 / F2 / N) | × real time | peak RAM | Whisper | notes |
|---|---|---|---|---|---|---|
| Kokoro 82M (baseline) | Apache-2.0 | 6.7 / 2.8 / 3.8 | ~1.1× | 1.5 GB | 1.0 | current narrator/"me" voice |
| Chatterbox (baseline, exag 0.7 cfg 0.3) | MIT | 174 / 84 / 93 | 29–47× | 6.4 GB | 0.76–1.0 | current Fragrance voice; F1 misread "I'm a new detergent" |
| Chatterbox Turbo 350M | MIT | clone 70 / 23 / 27; stock 50 / 23 / 29 | 7–11× | 6.0 GB | 0.88–1.0 | 3–4× faster than Chatterbox; exaggeration/cfg are ignored by Turbo, so expression comes from `[laugh]`/`[chuckle]` tags. Needs `setuptools<81` for the Perth watermarker |
| Pocket TTS 100M (main) | MIT code; voices per HF card | 3.8 / 1.5 / 1.7 | 0.65× | 1.0 GB | 0.82–1.0 | faster than real time. Stock voices only: cloning weights are gated on Hugging Face |
| Pocket TTS `english_drifting_26-09` | same | 3.4 / 1.3 / 1.9 | 0.7× | 1.0 GB | 1.0 | stock only |
| Pocket TTS `english_18m_2026-10` | same | 1.6 / 0.8 / 0.8 | 0.3× | 0.6 GB | 0.94–1.0 | stock only |
| Kitten TTS 2 1.7B | Stellon Labs Community License (free under $1M revenue/funding; registration and "Powered by KittenML" required for commercial use) | clone 241 / 106 / 113; stock 226 / 121 / 130 | 24–36× | 6.2 GB | 0.91–1.0 | 10 emotion tags and 10 vocal events. `<giggle>` may be spoken as the word "giggle", so check by ear. Stock voices: SarcasticCoworker (Fragrance), AudiobookNarratorFemale |
| Qwen3-TTS 1.7B CustomVoice | Apache-2.0 | 173 / 59 / 72; instruct 210 / 158 / 61 | 17–19× | 9.9 GB | 0.71–1.0 | stock voices Ryan and Serena. The instructed F2 opens with about 5 s of laughter |
| Qwen3-TTS 0.6B Base (cloning) | Apache-2.0 | 133 / 56 / 55 | 18–27× | 5.8 GB | 0.88–1.0 | 0.6B used instead of 1.7B Base to fit the disk |

## Skipped or pending

- **Chatterbox Nano** (MIT): gated on Hugging Face. It needs an account that has accepted the terms, plus a token on persepolis.
- **Pocket TTS cloning**: gated the same way.
- **VoxCPM2** (Apache-2.0, 2B): the community GGUFs are downloaded (`VoxCPM2-BaseLM-Q8_0` plus `Acoustic-F16`, 3.5 GB). Building the llama.cpp-omni engine from GitHub was blocked by the session's permission check, so it needs a permission rule or a manual build.
- **NeuTTS Air** (optional): not tried. It wasn't more expressive than the others, and disk was tight.
- **MOSS-TTS-Nano, Hojo-TTS-Light, Fish S2 Pro, Maya1**: ruled out earlier (licence unclear, no emotion control, or too big for this CPU).

## Note on cloning

The clone references are Kokoro output, so cloned takes inherit Kokoro's synthetic sound. For realism, the stock takes are the better test. To keep a character consistent across episodes, pick a stock or designed take, save 10–15 s of it as the new reference, and clone from that.

## Reproduce

Each model has its own venv under `/opt/antigravity/marketing/voice-bakeoff/` (`venv-turbo`, `venv-kitten`, `venv-qwen`, `venv-pocket`; CPU torch). The baselines use the existing `.venv` and `venv-chatterbox`.

    scripts/queue.sh turbo pocket kitten kitten-stock qwen-custom qwen-clone   # runs one at a time, writes logs/
    ../.venv/bin/python scripts/run_kokoro.py; ../venv-chatterbox/bin/python scripts/run_chatterbox.py
    ../.venv/bin/python scripts/score.py
