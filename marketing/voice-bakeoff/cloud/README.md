# Swipe Left voice bake-off, cloud rerun (2026-10-31)

The same lines, seeds, settings and reference clips as the persepolis run on branch `claude/project-thread-puf78h` (`marketing/voice-bakeoff/`), rerun in the "cloud" environment: 4 vCPU Intel Xeon @ 2.1 GHz, 15 GB RAM, no GPU. The Kokoro and Chatterbox baselines were skipped (not going forward with them). Expression tags are the same as on the server: Turbo `[chuckle]`/`[laugh]`, Kitten `[excited]` `<laugh>` `<giggle>` `(((emphasis)))` with the expressive preset, and Qwen tone instructions.

Seconds are compute for every take a model made (model already loaded), summed and compared with the same takes on persepolis.

| model | cloud sec | server sec | speed-up | cloud × real time | peak RAM |
|---|---|---|---|---|---|
| chatterbox-turbo | 134 | 390 | 2.9× | 3.0× | 6.1 GB |
| pocket-tts | 8 | 7 | 0.8× | 0.8× | 1.0 GB |
| pocket-tts-english_drifting_26-09 | 6 | 7 | 1.1× | 0.6× | 1.0 GB |
| pocket-tts-english_18m_2026-10 | 4 | 3 | 0.9× | 0.3× | 0.6 GB |
| kitten-tts-2 | 264 | 1620 | 6.1× | 4.9× | 5.7 GB |
| qwen3-tts-1.7b-customvoice | 284 | 732 | 2.6× | 6.9× | 10.3 GB |
| qwen3-tts-0.6b-base | 68 | 243 | 3.6× | 6.6× | 5.6 GB |

Whisper (base.en) matched the script at 0.9 or better on 36 of 38 takes; see `logs/scores.json`. Turbo stock F1 with tags said "an unscented product", and Qwen's instructed F2 opens with laughter, as on the server.

Changes from the server scripts: `run_turbo.py` loads from Hugging Face instead of a local snapshot path; `queue_cloud.sh` runs the models one at a time and clears each model's cache afterwards to fit disk; `compare.py` builds the table above. Run from the parent folder with the scripts from the server branch.

## Gemini TTS (online API)

`scripts/run_gemini.py` renders the same lines with Google's Gemini 3.8 Flash TTS and 3.1 Flash TTS preview (stock voices Puck for Fragrance, Kore for the narrator), reading the key from `GEMINI_API_KEY`. Each line is made plain and with style tags. 3.1 takes a spoken direction ("Say this like a smug, flirty ex…") plus `[chuckles]`/`[laughs]`/`[whispering]`. 3.8 reads such a direction aloud, so its tagged takes use bracket tags only (`--tags-only`). The free tier returns 429 after a few requests a minute; the script waits and retries, so a few logged times include that wait. Generation itself takes a few seconds per line. Whisper matched all 12 takes at 0.9 or better.
