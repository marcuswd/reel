#!/usr/bin/env python3
"""Trilha e efeitos do vídeo AcaiMg, sintetizados por código (sem licença de terceiros).

    python scripts/synth-acai-mg.py [pasta_saida]

Requer numpy, scipy e ffmpeg no PATH. Gera em public/distribuidora-acai-mg/audio:
  music-divertida.mp3   trilha de 28,5 s a 120 BPM (pluck tipo ukulele, baixo, bumbo, palmas, shaker, marimba)
  sfx-whoosh-01.mp3     transição
  sfx-pop-01.mp3        entrada do logo / cesta
  sfx-pop-02.mp3        três pops (embalagens)
  sfx-hit-01.mp3        carimbo forte
  sfx-hit-02.mp3        carimbo leve
  sfx-horn-01.mp3       buzina "bi-bi"
  sfx-chime-01.mp3      "plim" do WhatsApp

A estrutura segue o objeto D de src/acai-mg/AcaiMg.tsx: 1 batida = 15 frames a 30 fps.
Cortes nas batidas 6, 15, 23, 31, 39 e 47; fim na batida 57.
"""
import os
import subprocess
import sys
import tempfile

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
BPM = 120
BEAT = 60 / BPM
TOTAL_BEATS = 57  # 855 frames
OUT = sys.argv[1] if len(sys.argv) > 1 else "public/distribuidora-acai-mg/audio"
rng = np.random.default_rng(7)


def t_(dur):
    return np.arange(int(dur * SR)) / SR


def hz(note):
    """'C4' -> Hz"""
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    n, o = note[:-1], int(note[-1])
    return 440 * 2 ** ((names[n] + 12 * (o + 1) - 69) / 12)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def hp(x, f):
    return sosfilt(butter(2, f, btype="high", fs=SR, output="sos"), x)


def lp(x, f):
    return sosfilt(butter(2, f, btype="low", fs=SR, output="sos"), x)


# ── instrumentos ──
def pluck(f, dur=0.9, bright=1.0):
    t = t_(dur)
    y = sum((1 / n ** 1.3) * np.sin(2 * np.pi * n * f * t + n) * np.exp(-t * (3.5 + n * 1.8 / bright)) for n in range(1, 9))
    y *= np.minimum(1, t / 0.003)
    return y * 0.5


def marimba(f, dur=0.7):
    t = t_(dur)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 5) + 0.35 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 18)
    return y * np.minimum(1, t / 0.002) * 0.6


def glock(f, dur=1.4):
    t = t_(dur)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 3) + 0.3 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 8)
    return y * np.minimum(1, t / 0.001) * 0.45


def bass(f, dur=0.45):
    t = t_(dur)
    y = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t)
    env = np.minimum(1, t / 0.006) * np.exp(-t * 3.5) * np.clip((dur - t) / 0.03, 0, 1)
    return np.tanh(1.6 * y * env) * 0.6


def kick(dur=0.42):
    t = t_(dur)
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 8) * 0.95 + 0.15 * hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 120)


def clap(dur=0.25):
    t = t_(dur)
    n = bp(rng.standard_normal(len(t)), 900, 3200)
    env = np.zeros_like(t)
    for d in (0, 0.011, 0.022):
        env += (t >= d) * np.exp(-(t - d) * 60) * 0.5
    env += (t >= 0.03) * np.exp(-(t - 0.03) * 16)
    return n * env * 0.5


def shaker(dur=0.08, amp=0.15):
    t = t_(dur)
    return hp(rng.standard_normal(len(t)), 6000) * np.minimum(1, t / 0.01) * np.exp(-t * 45) * amp


# ── trilha ──
L = int((TOTAL_BEATS * BEAT + 1.2) * SR)
mus = np.zeros((L, 2))


def add(sig, at_beat, gain=1.0, pan=0.0):
    i = int(at_beat * BEAT * SR)
    if i >= L:
        return
    s = sig[: L - i] * gain
    mus[i : i + len(s), 0] += s * (1 - pan) / 1
    mus[i : i + len(s), 1] += s * (1 + pan) / 1


chords = {  # voicing de ukulele + baixo
    "C": (["G4", "C5", "E5", "C6"], "C2"),
    "G": (["G4", "B4", "D5", "G5"], "G1"),
    "Am": (["A4", "C5", "E5", "A5"], "A1"),
    "F": (["A4", "C5", "F5", "A5"], "F1"),
}
prog = ["C", "G", "Am", "F"]
strum = [(0, 1.0), (1, 0.7), (1.5, 0.55), (2.5, 0.6), (3, 0.75), (3.5, 0.55)]


def strum_at(ch, b, g, up=False):
    notes = chords[ch][0][::-1] if up else chords[ch][0]
    for k, n in enumerate(notes):
        add(pluck(hz(n)), b + k * 0.022 / BEAT, g * 0.32, pan=-0.25)


# intro (batidas 0-5): acorde de C com levada só de pluck + shaker
for b, g in [(0, 1.0), (1, 0.6), (1.5, 0.5), (2.5, 0.55), (3, 0.7), (3.5, 0.5), (4, 0.9), (4.5, 0.6), (5, 0.7), (5.5, 0.8)]:
    strum_at("C", b, g, up=(b % 1 != 0))
for k in range(12):
    add(shaker(amp=0.08 + 0.04 * (k % 2)), k * 0.5, pan=0.4)
# pickup do baixo antes do drop
for i, n in enumerate(["G1", "A1", "B1"]):
    add(bass(hz(n), 0.2), 5 + i / 3, 0.8)

# corpo (batidas 6-55): compassos começando na batida 6
melody = [  # (beat no compasso, nota, duração em batidas) por acorde
    {"C": [(0, "E5"), (1, "G5"), (1.5, "A5"), (2.5, "G5"), (3, "E5")],
     "G": [(0, "D5"), (1, "G5"), (2, "B5"), (3, "A5"), (3.5, "G5")],
     "Am": [(0, "C6"), (1, "A5"), (1.5, "G5"), (2.5, "E5"), (3, "G5")],
     "F": [(0, "A5"), (1, "C6"), (2, "A5"), (2.5, "G5"), (3, "F5"), (3.5, "E5")]},
]
bar = 0
b0 = 6
while b0 < 55:
    ch = prog[bar % 4]
    for off, g in strum:
        if b0 + off < 55:
            strum_at(ch, b0 + off, g, up=(off % 1 != 0))
    root = chords[ch][1]
    for off, n in [(0, root), (1.5, root), (2, root[:-1] + str(int(root[-1]) + 1)), (3, root), (3.5, root[:-1] + str(int(root[-1]) + 1))]:
        if b0 + off < 55:
            add(bass(hz(n), 0.42 if off in (0, 2) else 0.22), b0 + off, 0.9)
    for k in range(4):
        if b0 + k < 55:
            add(kick(), b0 + k, 0.9)
            if k in (1, 3):
                add(clap(), b0 + k, 0.55, pan=0.1)
    for k in range(16):
        if b0 + k / 4 < 55:
            add(shaker(amp=0.06 + 0.05 * (k % 2)), b0 + k / 4, pan=0.45)
    # marimba a partir do 3º compasso (cena das frutas em diante)
    if bar >= 2:
        for off, n in melody[0][ch]:
            if b0 + off < 55:
                add(marimba(hz(n)), b0 + off, 0.42, pan=0.35)
    bar += 1
    b0 += 4

# CTA: brilho de glockenspiel a partir da batida 47
for i, n in enumerate(["C6", "E6", "G6", "C7", "G6", "E6", "G6", "C7"]):
    add(glock(hz(n)), 47 + i * 0.5, 0.35, pan=-0.3)
# fecho: virada de palmas e acorde final de C na batida 55
for k, b in enumerate([54, 54.25, 54.5, 54.75]):
    add(clap(), b, 0.35 + 0.1 * k)
add(kick(), 55, 1.0)
add(bass(hz("C2"), 1.6), 55, 1.0)
for k, n in enumerate(["C5", "E5", "G5", "C6"]):
    add(pluck(hz(n), 2.0, bright=1.6), 55 + k * 0.03 / BEAT, 0.4)
add(glock(hz("C7"), 2.0), 55, 0.4)

mus = mus[: int(TOTAL_BEATS * BEAT * SR + 0.3 * SR)]
mus /= np.max(np.abs(mus)) + 1e-9
mus = np.tanh(mus * 1.3) / np.tanh(1.3)


# ── efeitos ──
def whoosh():
    t = t_(0.6)
    n = rng.standard_normal((len(t), 2))
    env = np.exp(-((t - 0.2) / 0.11) ** 2)
    lo = bp(n[:, 0], 250, 1400) * env
    hi = bp(n[:, 1], 1400, 7000) * np.exp(-((t - 0.23) / 0.08) ** 2)
    m = lo + 0.6 * hi
    pan = np.clip((t - 0.05) / 0.35, 0, 1)
    return np.stack([m * (1 - 0.6 * pan), m * (0.4 + 0.6 * pan)], 1)


def pop(f0=420, f1=1300, dur=0.14):
    t = t_(dur)
    f = f0 + (f1 - f0) * (1 - np.exp(-t * 60))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30)
    return y


def pops3():
    out = np.zeros(int(0.8 * SR))
    for i, (a, b) in enumerate([(380, 1100), (450, 1300), (520, 1500)]):
        p = pop(a, b)
        s = int(i * 8 / 30 * SR)
        out[s : s + len(p)] += p
    return out


def hit(strong=True):
    t = t_(0.5)
    f = 50 + 90 * np.exp(-t * 35)
    thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (9 if strong else 14))
    slap = bp(rng.standard_normal(len(t)), 700, 4000) * np.exp(-t * (40 if strong else 55))
    return thump * (1.0 if strong else 0.6) + slap * (0.7 if strong else 0.5)


def horn():
    out = np.zeros(int(0.45 * SR))
    for s in (0.0, 0.2):
        t = t_(0.13)
        saw = sum((1 / k) * np.sin(2 * np.pi * k * f * t) for f in (392, 494) for k in range(1, 7))
        y = lp(saw, 2200) * np.minimum(1, t / 0.008) * np.clip((0.13 - t) / 0.02, 0, 1)
        i = int(s * SR)
        out[i : i + len(y)] += y
    return out


def chime():
    out = np.zeros(int(1.5 * SR))
    for s, n in ((0, "E6"), (0.09, "B6")):
        g = glock(hz(n), 1.3)
        i = int(s * SR)
        out[i : i + len(g)] += g
    return out


sfx = {
    "sfx-whoosh-01": whoosh(),
    "sfx-pop-01": pop(),
    "sfx-pop-02": pops3(),
    "sfx-hit-01": hit(True),
    "sfx-hit-02": hit(False),
    "sfx-horn-01": horn(),
    "sfx-chime-01": chime(),
}


# ── saída ──
def save(name, x, loudnorm=False):
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.89
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, "a.wav")
        wavfile.write(wav, SR, (x * 32767).astype(np.int16))
        af = ["-af", "loudnorm=I=-16:TP=-1.5:LRA=11"] if loudnorm else []
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, *af, "-ar", str(SR), "-b:a", "192k", os.path.join(OUT, name + ".mp3")], check=True)


os.makedirs(OUT, exist_ok=True)
save("music-divertida", mus, loudnorm=True)
for k, v in sfx.items():
    save(k, v)
print("ok:", OUT)
