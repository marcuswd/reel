#!/usr/bin/env python3
"""Trilha original gerada por código, sincronizada aos cortes de qualquer job.

    python scripts/music.py <brief.json> <saida.mp3>

O brief vem de `pnpm video build` (src/core/timeline.ts > musicBrief): BPM, frame do
primeiro tempo forte (offsetFrames), duração, clima e as cenas com o frame em que cada
uma "assenta". Cada corte cai num tempo da música; a intensidade muda por tipo de cena.

Climas: upbeat (ukulele, palmas, marimba), corporate (piano, pad, batida leve),
tech (arpejo synth, sub, hats), calm (pad e piano, sem bateria), epic (cordas, tímpanos).
Sem licença de terceiros. Requer numpy, scipy e ffmpeg.
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
brief = json.load(open(sys.argv[1], encoding="utf-8"))
OUT = sys.argv[2]
FPS = brief["fps"]
BPM = float(brief["bpm"])
BEAT = 60.0 / BPM
T0 = brief["offsetFrames"] / FPS  # segundos do primeiro tempo forte
TOTAL = brief["totalFrames"] / FPS
MOOD = str(brief.get("mood", "corporate")).lower()
if MOOD not in ("upbeat", "corporate", "tech", "calm", "epic"):
    MOOD = {"divertida": "upbeat", "fun": "upbeat", "energetic": "upbeat", "inspiring": "corporate", "electronic": "tech", "ambient": "calm", "cinematic": "epic"}.get(MOOD, "corporate")
VOICE = bool(brief.get("hasVoice"))
rng = np.random.default_rng(abs(hash((MOOD, BPM, brief["totalFrames"]))) % 2**32)

L = int((TOTAL + 0.05) * SR)
mix = np.zeros((L, 2))


# ── DSP ──
def t_(d):
    return np.arange(int(d * SR)) / SR


def hz(n):
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    return 440 * 2 ** ((names[n[:-1]] + 12 * (int(n[-1]) + 1) - 69) / 12)


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


def filt(x, kind, f, order=2):
    return sosfilt(butter(order, f, btype=kind, fs=SR, output="sos"), x)


def add(sig, at, gain=1.0, pan=0.0):
    """Soma um sinal (mono ou estéreo) em `at` segundos."""
    i = int(at * SR)
    if i >= L or i + len(sig) <= 0:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    s = sig[: L - i] * gain
    if s.ndim == 1:
        mix[i : i + len(s), 0] += s * (1 - pan)
        mix[i : i + len(s), 1] += s * (1 + pan)
    else:
        mix[i : i + len(s)] += s


# ── instrumentos ──
def pluck(f, d=0.9, bright=1.0):
    t = t_(d)
    y = sum((1 / n ** 1.3) * np.sin(2 * np.pi * n * f * t + n) * np.exp(-t * (3.5 + n * 1.8 / bright)) for n in range(1, 9))
    return y * np.minimum(1, t / 0.003) * 0.5


def piano(f, d=1.6, vel=1.0):
    t = t_(d)
    y = sum((0.9 / n ** 1.6) * np.sin(2 * np.pi * n * f * (1 + 0.0004 * n) * t) * np.exp(-t * (1.6 + n * 0.9)) for n in range(1, 8))
    y += 0.08 * filt(rng.standard_normal(len(t)), "high", 2000) * np.exp(-t * 60)
    return y * np.minimum(1, t / 0.004) * np.clip((d - t) / 0.05, 0, 1) * 0.5 * vel


def pad(f, d, warm=1.0):
    t = t_(d)
    y = sum(np.sin(2 * np.pi * f * (1 + det) * t + p) for det, p in ((0, 0), (0.004, 1), (-0.0035, 2)))
    y += 0.3 * sum(np.sin(2 * np.pi * 2 * f * (1 + det) * t) for det in (0.002, -0.002))
    env = np.minimum(1, t / 0.35) * np.clip((d - t) / 0.4, 0, 1)
    return filt(y, "low", 1800 * warm) * env * 0.12


def saw(f, d, cutoff=2500, decay=6.0):
    t = t_(d)
    y = sum(((-1) ** (k + 1)) / k * np.sin(2 * np.pi * k * f * t) for k in range(1, 14))
    y = filt(y, "low", cutoff)
    return y * np.minimum(1, t / 0.004) * np.exp(-t * decay) * 0.35


def marimba(f, d=0.7):
    t = t_(d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 5) + 0.35 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 18)
    return y * np.minimum(1, t / 0.002) * 0.6


def bell(f, d=1.4):
    t = t_(d)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 3) + 0.3 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 8)
    return y * np.minimum(1, t / 0.001) * 0.4


def bass(f, d=0.45, drive=1.6):
    t = t_(d)
    y = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t)
    env = np.minimum(1, t / 0.006) * np.exp(-t * 3.5) * np.clip((d - t) / 0.03, 0, 1)
    return np.tanh(drive * y * env) * 0.6


def kick(soft=False):
    t = t_(0.42)
    f = 45 + 110 * np.exp(-t * 28)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (10 if soft else 8))
    return y * (0.6 if soft else 0.95) + 0.12 * filt(rng.standard_normal(len(t)), "high", 3000) * np.exp(-t * 120)


def snare():
    t = t_(0.25)
    n = filt(rng.standard_normal(len(t)), "band", [1200, 6000]) * np.exp(-t * 22)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    return (n * 0.5 + tone * 0.4) * 0.8


def clap():
    t = t_(0.25)
    n = filt(rng.standard_normal(len(t)), "band", [900, 3200])
    env = sum((t >= d) * np.exp(-(t - d) * 60) * 0.5 for d in (0, 0.011, 0.022)) + (t >= 0.03) * np.exp(-(t - 0.03) * 16)
    return n * env * 0.5


def hat(open_=False, amp=0.12):
    t = t_(0.3 if open_ else 0.06)
    return filt(rng.standard_normal(len(t)), "high", 7000) * np.exp(-t * (12 if open_ else 70)) * amp


def tom(f=110):
    t = t_(0.7)
    fr = f + f * 0.6 * np.exp(-t * 20)
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 5) * 0.8


def crash(amp=0.25):
    t = t_(2.2)
    return filt(rng.standard_normal(len(t)), "high", 4000) * np.exp(-t * 2.2) * amp


def swell(d):
    """Ruído reverso que cresce até o corte."""
    t = t_(d)
    n = rng.standard_normal((len(t), 2))
    env = (t / d) ** 2.5
    cutoff = np.linspace(400, 8000, len(t))
    lo = filt(n[:, 0], "band", [300, 6000]) * env
    hi = filt(n[:, 1], "band", [600, 9000]) * env
    return np.stack([lo, hi], 1) * 0.18 + 0 * cutoff[:, None]


# ── harmonia ──
KEYS = {"upbeat": 60, "corporate": 62, "tech": 57, "calm": 64, "epic": 50}  # C, D, A, E, D (MIDI da tônica)
PROGS = {
    "upbeat": [(0, "M"), (7, "M"), (9, "m"), (5, "M")],  # I V vi IV
    "corporate": [(0, "M"), (9, "m"), (5, "M"), (7, "M")],  # I vi IV V
    "tech": [(0, "m"), (8, "M"), (3, "M"), (10, "M")],  # i VI III VII
    "calm": [(0, "M"), (5, "M"), (9, "m"), (5, "M")],
    "epic": [(0, "m"), (8, "M"), (3, "M"), (10, "M")],
}
root = KEYS[MOOD]


def chord(i):
    off, q = PROGS[MOOD][i % 4]
    r = root + off
    third = 4 if q == "M" else 3
    return r, [r, r + third, r + 7]


# ── estrutura: intensidade por cena ──
LEVEL = {"cover": 1, "statement": 2, "media": 2, "split": 2, "screen": 2, "quote": 1, "list": 3, "stats": 3, "gallery": 3, "cta": 3, "logo": 2}
scenes = brief["scenes"]
lands = [s["land"] / FPS for s in scenes]
END = TOTAL


def level_at(t):
    lv = 1
    for s in scenes:
        if s["land"] / FPS - 0.01 <= t:
            lv = LEVEL.get(s["type"], 2)
    if t < (scenes[1]["land"] / FPS if len(scenes) > 1 else END):
        lv = 1
    return lv


n_beats = int((END - T0) / BEAT) + 1
last_bar_start = T0 + (n_beats // 4) * 4 * BEAT
outro_at = max(T0, END - 2 * BEAT)  # acorde final 2 tempos antes do fim

# pickup antes do primeiro tempo forte
if T0 > 0.2:
    add(swell(T0), 0, 0.6)

for b in range(n_beats):
    t = T0 + b * BEAT
    if t >= outro_at:
        break
    bar, beat = divmod(b, 4)
    lv = level_at(t)
    r, notes = chord(bar)
    ch_dur = min(4 * BEAT, outro_at - t)

    # bateria
    if MOOD != "calm":
        if MOOD in ("upbeat", "tech"):
            if lv >= 2 or MOOD == "tech":
                add(kick(soft=lv < 2), t, 0.9)
            if beat in (1, 3) and lv >= 2:
                add(clap() if MOOD == "upbeat" else snare(), t, 0.5)
            for k in range(2 if lv < 3 else 4):
                add(hat(amp=0.07 + 0.04 * (k % 2)), t + k * BEAT / (2 if lv < 3 else 4), pan=0.4)
        elif MOOD == "corporate":
            if beat in (0, 2) and lv >= 2:
                add(kick(soft=True), t, 0.8)
            if beat in (1, 3) and lv >= 3:
                add(clap(), t, 0.25)
            if lv >= 2:
                add(hat(amp=0.05), t + BEAT / 2, pan=0.3)
        elif MOOD == "epic":
            if beat == 0:
                add(kick(), t, 0.9)
                add(tom(70), t, 0.5)
            if lv >= 3 and beat in (1, 3):
                add(tom(110), t, 0.4, pan=-0.2)

    # harmonia
    if beat == 0:
        if MOOD in ("corporate", "calm", "epic"):
            for n in notes:
                add(pad(midi(n), ch_dur + 0.3, warm=0.7 if MOOD == "epic" else 1.0), t, 0.9 if MOOD != "epic" else 1.3, pan=0.0)
        if MOOD in ("corporate", "calm"):
            for k, n in enumerate(notes + [notes[0] + 12]):
                add(piano(midi(n), 2.2, vel=0.8), t + k * 0.012, 0.5, pan=-0.15)
        if MOOD == "tech" or MOOD == "epic":
            add(bass(midi(r - 24), ch_dur, drive=1.2), t, 0.8)
    if MOOD == "upbeat":
        for off, g in [(0, 1.0), (1, 0.7), (1.5, 0.55), (2.5, 0.6), (3, 0.75), (3.5, 0.55)]:
            if beat == int(off):
                tt = t + (off - int(off)) * BEAT
                if tt < outro_at:
                    for k, n in enumerate(notes + [notes[0] + 12]):
                        add(pluck(midi(n + 12)), tt + k * 0.02, g * 0.28, pan=-0.25)
        if lv >= 2:
            for off in ((0, 1.5) if beat == 0 else (0,) if beat == 2 else ()):
                add(bass(midi(r - 24), 0.4), t + off * BEAT, 0.9)
    if MOOD == "corporate" and lv >= 2 and beat in (0, 2):
        add(bass(midi(r - 24), BEAT * 1.8, drive=1.1), t, 0.7)
    if MOOD == "tech":
        arp = [notes[0], notes[1], notes[2], notes[0] + 12]
        steps = 4 if lv >= 2 else 2
        for k in range(steps):
            add(saw(midi(arp[(b * steps + k) % 4] + 12), BEAT / steps * 0.9, cutoff=1500 + 900 * lv, decay=9), t + k * BEAT / steps, 0.35, pan=0.3 if k % 2 else -0.3)
        if beat == 0:
            for n in notes:
                add(pad(midi(n), ch_dur, warm=1.2), t, 0.7)

    # melodia (só sem locução, ou bem discreta com ela)
    if lv >= 3 or (lv >= 2 and MOOD in ("upbeat", "corporate")):
        scale = [0, 2, 4, 7, 9, 12]
        if rng.random() < (0.35 if VOICE else 0.75):
            n = root + 12 + scale[int(rng.integers(0, len(scale)))] + (PROGS[MOOD][bar % 4][0] if beat == 0 else 0)
            inst = {"upbeat": marimba, "corporate": bell, "tech": lambda f: saw(f, 0.3, 3000, 12), "calm": bell, "epic": bell}[MOOD]
            add(inst(midi(n)), t + (0.5 * BEAT if beat % 2 else 0), 0.3 if VOICE else 0.42, pan=0.35)

# transições: swell antes e prato no "assentar" de cada cena (intensidade alta)
for s in scenes[1:]:
    land = s["land"] / FPS
    lv = LEVEL.get(s["type"], 2)
    if MOOD != "calm":
        add(swell(BEAT), land - BEAT, 0.5 + 0.15 * lv)
        if lv >= 3 or s["type"] in ("cta", "logo"):
            add(crash(0.18), land, 1.0, pan=0.2)

# final: acorde sustentado
r, notes = chord(0)
fin = {"upbeat": lambda f: pluck(f, 2.5, 1.6), "corporate": lambda f: piano(f, 3.0), "tech": lambda f: pad(f, 3.0, 1.4) * 3, "calm": lambda f: piano(f, 3.0), "epic": lambda f: pad(f, 3.2, 0.8) * 3}[MOOD]
for k, n in enumerate(notes + [notes[0] + 12]):
    add(fin(midi(n)), outro_at + k * 0.02, 0.45)
add(bass(midi(r - 24), 2.0), outro_at, 0.8)
if MOOD != "calm":
    add(kick(), outro_at, 0.9)
    add(crash(0.22), outro_at, 1.0)
add(bell(midi(root + 24), 2.5), outro_at, 0.3)

# ── master ──
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
fade = int(0.15 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]

os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
with tempfile.TemporaryDirectory() as d:
    wav = os.path.join(d, "a.wav")
    wavfile.write(wav, SR, (mix * 0.89 * 32767).astype(np.int16))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-b:a", "192k", OUT], check=True)
print(f"trilha {MOOD} {BPM:.0f} BPM {TOTAL:.1f}s -> {OUT}")
