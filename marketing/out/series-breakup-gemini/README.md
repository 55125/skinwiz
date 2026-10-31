# Breakup Part 2, re-voiced with Gemini TTS (2026-10-31)

Same beats, screens and sound effects as `series_breakup.py` Part 2 (branch `claude/project-thread-puf78h`), with every voice from Gemini instead of Kokoro/Chatterbox:
me = Leda, Fragrance = Puck (Gemini 3.8 Flash TTS, audio tags), narrator = Sulafat (Gemini 3.1 Flash TTS for now; 3.8's free tier allows 10 requests a day and ran out).

    GEMINI_API_KEY=... python gemini_part2.py --narrator-31     # voices -> gem/, timeline + audio
    node marketing/html-render/render.js gem/part2-timeline.json frames/
    ffmpeg -framerate 30 -i frames/%05d.png -i gem/part2-audio.wav -c:v libx264 -crf 20 -pix_fmt yuv420p \
      -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest breakup-part-2-gemini.mp4

`clean()` cuts the ~0.13 s burst of noise that Gemini 3.8 adds to the end of every clip. Delete a line's WAV in `gem/` (or pass `--redo bN`) to re-voice just that line.
