"""Small toolkit for scripted reels: Kokoro voices, simple sound effects,
Pillow-drawn frames and an ffmpeg assembler (one segment per beat).

A reel is a list of beats. Each beat has a frame (PNG, optionally over a
scrolling background image) and an audio clip; the beat lasts as long as its
audio, rounded up to whole video frames, so picture and sound stay in sync.
"""
import math, os, subprocess, warnings
import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFont

warnings.filterwarnings("ignore")
SR, W, H, FPS = 24000, 1080, 1920, 30
HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = "/usr/share/fonts/truetype"
TEAL, CREAM, INK, GREY = (0, 107, 95), (243, 240, 234), (27, 31, 36), (90, 96, 104)

# ---------- audio ----------
_pipes = {}
def say(text, voice, speed=1.0):
    from kokoro import KPipeline
    lang = voice[0]  # 'a' = American, 'b' = British
    if lang not in _pipes:
        _pipes[lang] = KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M")
    return np.concatenate([np.asarray(a) for _, _, a in _pipes[lang](text, voice=voice, speed=speed)]).astype(np.float32)

def silence(seconds):
    return np.zeros(int(SR * seconds), np.float32)

def blip(freq=1320, dur=0.09, vol=0.22):
    t = np.arange(int(SR * dur)) / SR
    return (vol * np.sin(2 * np.pi * freq * t) * np.exp(-t * 40)).astype(np.float32)

def boom(dur=1.8, vol=0.7):
    t = np.arange(int(SR * dur)) / SR
    tone = np.sin(2 * np.pi * (52 - 14 * t / dur) * t) + 0.5 * np.sin(2 * np.pi * 34 * t)
    noise = np.convolve(np.random.default_rng(1).standard_normal(len(t)), np.ones(60) / 60, "same")
    return (vol * (tone * np.exp(-t * 2.2) + 0.8 * noise * np.exp(-t * 14)) / 1.6).astype(np.float32)

def reverb(x, taps=((0.055, 0.28), (0.12, 0.16), (0.21, 0.08))):
    out = np.concatenate([x, silence(max(d for d, _ in taps) + 0.05)])
    for d, g in taps:
        k = int(SR * d); out[k:k + len(x)] += g * x
    return out

def mix(base, clip, at=0.0):
    k = int(SR * at)
    if k + len(clip) > len(base):
        base = np.concatenate([base, np.zeros(k + len(clip) - len(base), np.float32)])
    base = base.copy(); base[k:k + len(clip)] += clip
    return base

# ---------- drawing ----------
def font(name, size):
    path = {"regular": "lato/Lato-Regular.ttf", "bold": "lato/Lato-Bold.ttf", "black": "lato/Lato-Black.ttf",
            "serif": "liberation/LiberationSerif-Bold.ttf"}[name]
    return ImageFont.truetype(os.path.join(FONTS, path), size)

def wrap(draw, text, fnt, width):
    lines = []
    for para in text.split("\n"):
        line = ""
        for word in para.split():
            trial = f"{line} {word}".strip()
            if draw.textlength(trial, font=fnt) <= width or not line:
                line = trial
            else:
                lines.append(line); line = word
        lines.append(line)
    return lines

def end_card(path, headline="Check before you buy.", sub="Save their avoid list once, then check any product against it."):
    img = Image.new("RGB", (W, H), CREAM); d = ImageDraw.Draw(img)
    logo = Image.open(os.path.join(HERE, "logo.png")); logo = logo.resize((logo.width * 2, logo.height * 2), Image.LANCZOS)
    img.paste(logo, ((W - logo.width) // 2, 430))
    y = 680
    for ln in wrap(d, headline, font("black", 84), 940):
        d.text((W // 2, y), ln, font=font("black", 84), fill=INK, anchor="mt"); y += 100
    y += 20
    for ln in wrap(d, sub, font("regular", 46), 860):
        d.text((W // 2, y), ln, font=font("regular", 46), fill=GREY, anchor="mt"); y += 62
    y += 60
    d.rounded_rectangle((110, y, W - 110, y + 200), 36, fill=TEAL)
    d.text((W // 2, y + 60), "Free at activelyskin.com", font=font("bold", 60), fill="white", anchor="mt")
    d.text((W // 2, y + 138), "Built by a board-certified dermatologist", font=font("regular", 36), fill=(220, 236, 232), anchor="mt")
    d.text((W // 2, 1560), "Education, not medical advice.", font=font("regular", 34), fill=GREY, anchor="mt")
    img.save(path)
    return path

# ---------- assembly ----------
def build(beats, out, work, scroll=None, loudness=-14):
    """beats: list of {"png": frame, "audio": np.array, "scroll": bool}.
    scroll: optional {"png": tall image, "alpha": 0.3, "y0": start y, "y1": end y}
    moved linearly across all beats flagged scroll=True."""
    os.makedirs(work, exist_ok=True)
    for b in beats:
        if b.get("min_seconds"):
            b["audio"] = np.pad(b["audio"], (0, max(0, int(SR * b["min_seconds"]) - len(b["audio"]))))
        b["frames"] = math.ceil(len(b["audio"]) / SR * FPS)
        b["audio"] = np.pad(b["audio"], (0, round(b["frames"] / FPS * SR) - len(b["audio"])))
    scroll_total = sum(b["frames"] for b in beats if b.get("scroll")) or 1
    done, segs = 0, []
    for i, b in enumerate(beats, 1):
        seg = os.path.join(work, f"beat-{i:02d}.mp4")
        if b.get("video"):
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", b["video"], "-an",
                            "-vf", f"fps={FPS},scale={W}:{H},tpad=stop_mode=clone:stop_duration=60,format=yuv420p",
                            "-frames:v", str(b["frames"]), "-c:v", "libx264", "-preset", "medium", "-crf", "20", seg], check=True)
            segs.append(seg); print(f"beat {i}: {b['frames'] / FPS:.2f}s (clip)", flush=True); continue
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"color=c=black:s={W}x{H}:r={FPS}",
               "-loop", "1", "-framerate", str(FPS), "-i", b["png"]]
        if scroll and b.get("scroll"):
            y0 = scroll["y0"] + (scroll["y1"] - scroll["y0"]) * done / scroll_total
            y1 = scroll["y0"] + (scroll["y1"] - scroll["y0"]) * (done + b["frames"]) / scroll_total
            dur = b["frames"] / FPS
            cmd += ["-loop", "1", "-framerate", str(FPS), "-i", scroll["png"]]
            # frame PNG is RGBA text over a transparent background; scroll sits beneath it
            fc = (f"color=c=0x{scroll.get('bg', '0B0B0C')}:s={W}x{H}:r={FPS}[bg];"
                  f"[2:v]format=rgba,colorchannelmixer=aa={scroll['alpha']}[s];"
                  f"[bg][s]overlay=x=(W-w)/2:y='-({y0:.1f}+({y1 - y0:.1f})*t/{dur:.4f})'[b];"
                  f"[b][1:v]overlay=0:0,format=yuv420p")
            done += b["frames"]
        else:
            fc = "[0:v][1:v]overlay=0:0,format=yuv420p"
        cmd += ["-filter_complex", fc, "-frames:v", str(b["frames"]), "-c:v", "libx264", "-preset", "medium",
                "-crf", "20", "-r", str(FPS), seg]
        subprocess.run(cmd, check=True); segs.append(seg)
        print(f"beat {i}: {b['frames'] / FPS:.2f}s", flush=True)
    audio = np.concatenate([b["audio"] for b in beats])
    audio /= max(1.0, np.abs(audio).max() / 0.95)
    wav = os.path.join(work, "audio.wav"); sf.write(wav, audio, SR)
    lst = os.path.join(work, "concat.txt")
    open(lst, "w").write("".join(f"file '{s}'\n" for s in segs))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-i", wav,
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", f"loudnorm=I={loudness}:TP=-1.5:LRA=11",
                    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "-shortest", out], check=True)
    print("wrote", out, f"({len(audio) / SR:.2f}s)")

