#!/usr/bin/env python3
"""Pack de efeitos sonoros próprio (sintetizado, sem licença de terceiros).

    python scripts/sfx.py [pasta]      (padrão: public/_lib/sfx)

Nomes usados pelo planejador (src/core/timeline.ts): whoosh, whoosh-2, whoosh-soft, swoosh,
glitch, riser, impact, hit-soft, pop, pop-soft, tick, click, chime.
Para trocar um efeito por um de banco (pnpm audio:get), salve com o mesmo nome em outra
pasta e aponte "sfx.pack" do job para ela.
"""
import os
import subprocess
import sys
import tempfile

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
OUT = sys.argv[1] if len(sys.argv) > 1 else "public/_lib/sfx"
rng = np.random.default_rng(11)


def t_(d):
    return np.arange(int(d * SR)) / SR


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], btype="band", fs=SR, output="sos"), x)


def hp(x, f):
    return sosfilt(butter(2, f, btype="high", fs=SR, output="sos"), x)


def lp(x, f):
    return sosfilt(butter(2, f, btype="low", fs=SR, output="sos"), x)


def whoosh(d=0.6, peak=0.2, width=0.11, lo=(250, 1400), hi=(1400, 7000)):
    t = t_(d)
    n = rng.standard_normal((len(t), 2))
    a = bp(n[:, 0], *lo) * np.exp(-((t - peak) / width) ** 2)
    b = bp(n[:, 1], *hi) * np.exp(-((t - peak - 0.03) / (width * 0.75)) ** 2)
    m = a + 0.6 * b
    pan = np.clip((t - 0.05) / 0.35, 0, 1)
    return np.stack([m * (1 - 0.6 * pan), m * (0.4 + 0.6 * pan)], 1)


def swoosh():
    t = t_(0.45)
    f = 300 + 3000 * (t / 0.45) ** 1.5
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.15
    n = bp(rng.standard_normal(len(t)), 800, 6000)
    env = np.exp(-((t - 0.17) / 0.09) ** 2)
    return (n * 0.8 + tone) * env


def glitch():
    out = np.zeros(int(0.35 * SR))
    for i in range(7):
        s = int(i * 0.045 * SR)
        d = int(0.03 * SR)
        f = rng.uniform(200, 2400)
        tt = t_(0.03)
        seg = np.sign(np.sin(2 * np.pi * f * tt)) * 0.4 + bp(rng.standard_normal(d), 2000, 9000) * 0.5
        out[s : s + d] += seg[: len(out[s : s + d])] * (1 - i / 9)
    return out


def riser(d=1.6):
    t = t_(d)
    f = 200 + 1800 * (t / d) ** 2
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.2
    n = bp(rng.standard_normal(len(t)), 500, 8000) * 0.6
    env = (t / d) ** 2.2 * np.clip((d - t) / 0.03, 0, 1)
    return (tone + n) * env


def impact(strong=True):
    t = t_(1.2)
    f = 42 + 90 * np.exp(-t * 30)
    thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (5 if strong else 12))
    slap = bp(rng.standard_normal(len(t)), 600, 5000) * np.exp(-t * (30 if strong else 50))
    tail = lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 3) * 0.2
    return thump + slap * 0.6 + (tail if strong else 0)


def pop(f0=420, f1=1300, d=0.14):
    t = t_(d)
    f = f0 + (f1 - f0) * (1 - np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30)


def tick():
    t = t_(0.06)
    return (np.sin(2 * np.pi * 2600 * t) * 0.6 + hp(rng.standard_normal(len(t)), 5000) * 0.3) * np.exp(-t * 90)


def click():
    t = t_(0.08)
    a = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 160)
    b = np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 120) * 0.5
    return a + b


def chime():
    out = np.zeros(int(1.5 * SR))
    for s, f in ((0, 1318.5), (0.09, 1975.5)):
        t = t_(1.3)
        g = (np.sin(2 * np.pi * f * t) * np.exp(-t * 3) + 0.3 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 8)) * np.minimum(1, t / 0.001)
        i = int(s * SR)
        out[i : i + len(g)] += g
    return out


SFX = {
    "whoosh": whoosh(),
    "whoosh-2": whoosh(0.7, 0.2, 0.08, (400, 2500), (2000, 9000)),
    "whoosh-soft": lp(whoosh(0.8, 0.27, 0.16)[:, 0], 2500),
    "swoosh": swoosh(),
    "glitch": glitch(),
    "riser": riser(),
    "impact": impact(True),
    "hit-soft": impact(False),
    "pop": pop(),
    "pop-soft": pop(300, 900, 0.12),
    "tick": tick(),
    "click": click(),
    "chime": chime(),
}


def save(name, x):
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.89
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, "a.wav")
        wavfile.write(wav, SR, (x * 32767).astype(np.int16))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-ar", str(SR), "-b:a", "192k", os.path.join(OUT, name + ".mp3")], check=True)


os.makedirs(OUT, exist_ok=True)
for k, v in SFX.items():
    save(k, v)
print(f"{len(SFX)} efeitos em {OUT}")
