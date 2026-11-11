# "A statement from Fragrance" reel (Notes-app apology, Nov 27)

Preview voices are Kokoro; final voices are Gemini 3.8 Lite (Fragrance = Puck, me = Leda, narrator = Sulafat).

    python reel.py                                       # kokoro/ timeline + audio (persepolis .venv)
    GEMINI_API_KEY=... python reel.py --engine gemini    # gemini/ timeline + audio (9 lines)
    node marketing/html-render/render_notes.js marketing/out/statement/gemini/timeline.json frames/
    ffmpeg -framerate 30 -i frames/%05d.png -i marketing/out/statement/gemini/audio.wav -c:v libx264 -crf 20 -pix_fmt yuv420p \
      -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest statement-gemini.mp4

The notes screen is a generic notes app (slate accent, no Apple styling). Michael approved the silent cut (22.4 s) on Nov 10 and wants the quicker pace kept: Fragrance lines carry a [brisk] tag. Aim for about 22 s, never over 25: shorten silences, not words.
If the 3.8 Lite free limit stops it, cached lines are kept; re-run after the reset rather than mixing models.
