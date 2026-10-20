# Actively Skin: narrated reels from carousels

Turns a carousel (a folder of 4:5 slide PNGs) and a narration script into a
1080x1920, 30 fps H.264/AAC reel. The voiceover comes from Kokoro TTS
(hexgrad/Kokoro-82M, Apache-2.0) running locally on the CPU, and the captions
are burned in. Nothing here posts anywhere.

## One command

    cd /opt/antigravity/marketing
    ./make_reel.sh SLIDES_DIR SCRIPT.txt OUTPUT.mp4 [voice] [speed]

    # the sample reel:
    ./make_reel.sh source/eczema-shopping-checklist script.txt out/eczema-checklist-reel.mp4

On this machine (i7-4600U, 4 threads, no GPU) a 7-slide reel takes about 2 minutes:
roughly 1 minute for TTS and 1 minute for rendering.
Defaults: voice `af_heart` (American English), speed `1.0`.

## Script format

- One line per slide, in slide order. Slides are sorted naturally by filename, so 1, 2 … 10 come out in order.
  The number of lines must equal the number of slides.
- Lines that are blank or start with `#` are ignored.
- `caption || spoken` gives the voice a different spelling from the caption,
  e.g. `free at activelyskin.com. || free at Actively Skin dot com.`
- Each caption is split into sentences, and each sentence is shown in turn,
  timed by its character count.
- Keep to what the slides say: no new health claims, no "toxic", no cure/treat
  language, and keep the urgent-care line word for word wherever a slide has one.

## The pieces

| file | what it does |
|---|---|
| `make_reel.sh` | wrapper: runs tts.py, then render.py, then ffprobe |
| `tts.py SCRIPT OUTDIR [--voice --speed --gap 0.35 --lead 0.25]` | Kokoro: writes `line-NN.wav`, `voiceover.wav` and `timings.json`. Each line is padded to a whole number of frames |
| `render.py SLIDES TTS_DIR OUT.mp4 [--bg E8E3D9 --font Lato]` | one segment per slide (the slide scaled to 920x1150 at 80,170 on a soft background, with the caption from y=1375, above the Instagram UI), then a lossless concat and the voiceover muxed in |
| `work/<output-name>/` | intermediate files; safe to delete |
| `source/` | slides taken from branch `claude/project-thread-puf78h`, `marketing/source/weeks-1-2/` |

To refresh the source slides without checking that branch out:

    cd /opt/antigravity/skinwiz
    git fetch origin claude/project-thread-puf78h
    git archive origin/claude/project-thread-puf78h marketing/source/weeks-1-2 | tar -x -C /opt/antigravity/marketing/work
    # then copy work/marketing/source/weeks-1-2/<carousel>-*.png into source/<carousel>/

## Setup (already done here)

    /home/michael/.local/bin/python3.11 -m venv .venv
    .venv/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu   # CPU wheel, avoids several GB of CUDA libraries
    .venv/bin/pip install kokoro soundfile

The first run downloads the Kokoro weights from Hugging Face (about 330 MB, cached in `~/.cache/huggingface`)
and spaCy `en_core_web_sm`. The system espeak-ng is not installed (no sudo). misaki's
`espeakng-loader` wheel covers out-of-vocabulary words. ffmpeg 8 with libass is in /usr/bin.

Other voices: `af_bella`, `af_nicole`, `am_michael`, `am_fenrir`, `bf_emma` (British) and more;
see https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md

## Scripted reels (skits, trailers): `reels/`

These are for reels that aren't a carousel read aloud. Each one is a single Python file
holding its script, with the shared helpers in `reels/reelkit.py`: Kokoro voices,
blip and boom sound effects, simple reverb, Pillow frames, the end card, a scrolling
background layer, and an ffmpeg assembler with loudness set to -14 LUFS.

    cd /opt/antigravity/marketing/reels
    ../.venv/bin/python breakup.py ../out/breakup-reel.mp4   # A: breakup text to an avoid-list ingredient (af_heart + am_puck)
    ../.venv/bin/python trailer.py ../out/trailer-reel.mp4   # B: ingredient label as a movie trailer (am_onyx at 0.86x + af_heart)

Each takes 1 to 3 minutes here. To make a new one, copy one of these files and edit the
`SCRIPT`/`BEATS` list at the top. The voice is am_onyx because it measured the deepest of
the Kokoro male voices (about 86 Hz median pitch; am_echo about 101, am_michael about 113, am_fenrir about 130).
`reels/logo.png` is cropped from carousel slide 1.

## Series: "Breaking up with ingredients" (`reels/series_breakup.py`)

    cd /opt/antigravity/marketing/reels
    ../.venv/bin/python series_breakup.py          # all three parts, or: series_breakup.py 2
    # writes out/breakup-part-{1,2,3}.mp4

- "me" is Kokoro af_heart and the narrator is Kokoro af_bella.
- The ingredient characters are **Chatterbox**, which runs in its own venv,
  `venv-chatterbox` (CPU torch 2.6, about 1.9 GB plus about 3 GB of weights). Its batch helper is `reels/cbx_say.py`.
- Each character is cloned from a Kokoro sample. In Parts 1 and 2 every texter is the same ex (am_puck),
  and Methylisothiazolinone is am_echo.
  Exaggeration is 0.7 and cfg is 0.3.
- Chatterbox takes about 30 to 37 s of compute per second of audio here, plus about 25 s to load.
  Lines are cached in `work/series-breakup/cbx-cache`, so changing a single line only re-renders that line.
- Each Chatterbox take is transcribed with Whisper (base.en). A take scoring below 0.9 against
  the script is re-rendered with a new seed, because Chatterbox sometimes adds a stray word at the end.
- The chat and scan screens are drawn in `reels/chatui.py`, with colour emoji from Noto Color Emoji.
  To add a part, add an entry to `PARTS`.
