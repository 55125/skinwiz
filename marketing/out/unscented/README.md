# "I'm unscented now" reel (breakup-series sequel)

Preview voices are Kokoro; final voices are Gemini (me = Leda, Fragrance = Puck, narrator = Sulafat, 3.8 Lite).

    python reel.py                                       # kokoro/ timeline + audio (run from .venv on persepolis)
    GEMINI_API_KEY=... python reel.py --engine gemini    # gemini/ timeline + audio
    node marketing/html-render/render.js marketing/out/unscented/gemini/timeline.json frames/
    ffmpeg -framerate 30 -i frames/%05d.png -i marketing/out/unscented/gemini/audio.wav -c:v libx264 -crf 20 -pix_fmt yuv420p \
      -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest unscented-gemini.mp4

Set CHROMIUM_PATH if Playwright can't find its browser. Delete a line's WAV, or pass `--redo bN`, to re-voice one line.
