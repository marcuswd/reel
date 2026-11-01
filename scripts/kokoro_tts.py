"""Locução local com Kokoro (kokoro-onnx, CPU, Apache 2.0). Chamado por scripts/voice.ts.

uso: python kokoro_tts.py <modelo.onnx> <voices.bin> <voz> <lang> <velocidade> <texto.txt> <saida.wav>
"""
import sys

import soundfile as sf
from kokoro_onnx import Kokoro

model, voices, voice, lang, speed, text_file, out = sys.argv[1:8]
with open(text_file, encoding="utf-8") as f:
    text = f.read().strip()
samples, rate = Kokoro(model, voices).create(text, voice=voice, speed=float(speed), lang=lang)
sf.write(out, samples, rate)
