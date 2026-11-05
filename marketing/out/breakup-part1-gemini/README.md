# Breakup Part 1, Gemini voices (for the ad test against Unscented)

    GEMINI_API_KEY=... python reel.py --engine gemini
    node marketing/html-render/render.js marketing/out/breakup-part1-gemini/gemini/timeline.json frames/
    ffmpeg -framerate 30 -i frames/%05d.png -i marketing/out/breakup-part1-gemini/gemini/audio.wav -c:v libx264 -crf 20 -pix_fmt yuv420p \
      -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest breakup-part-1-gemini.mp4

Eight lines. If 3.8 Lite's free limit (10 a day, also used by the Unscented reel) stops it, the voiced lines stay cached; re-run after the reset.
Aim for 25 s or less: shorten the silences in `audio_for`, never the words.
