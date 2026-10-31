// Trilha original da v5 (corporativa/inspiradora, 120 BPM) e efeitos sonoros,
// sintetizados a partir da timeline do vídeo. Sem samples nem licenças.
//
//   pnpm trilha:v5      (npx -y tsx scripts/trilha-v5.ts)
//
// Gera em public/cms/audio/: v5-trilha.wav, v5-whoosh.wav, v5-impact.wav, v5-tick.wav, v5-pop.wav
// Mudou o roteiro ou o número de compassos? Rode outra vez: a música segue a timeline.
import { mkdirSync, writeFileSync } from "node:fs";
import { BAR, BEAT, FPS, PLACED, T, TOTAL_BARS, type Placed } from "../src/cms-v5/timeline";

const SR = 44100;
const OUT = "public/cms/audio";
const SPB = BEAT / FPS; // segundos por tempo (0,5)
const BAR_S = BAR / FPS; // 2 s
const T0 = T / FPS; // o compasso 0 começa quando a capa "assenta"
const LEN = (TOTAL_BARS * BAR + T) / FPS + 0.05;
const N = Math.ceil(LEN * SR);

// ── utilidades ──
let seed = 1234567;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);
const S = (t: number) => Math.round(t * SR);

class Bus {
  L = new Float32Array(N);
  R = new Float32Array(N);
  add(at: number, mono: Float32Array, gain = 1, pan = 0, R?: Float32Array) {
    const i0 = S(at);
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
    const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
    for (let i = 0; i < mono.length; i++) {
      const j = i0 + i;
      if (j < 0 || j >= N) continue;
      this.L[j] += mono[i] * gl;
      this.R[j] += (R ? R[i] : mono[i]) * gr;
    }
  }
}

/** Biquad RBJ, aplicado no lugar. */
function biquad(x: Float32Array, type: "lp" | "hp" | "bp", f: number, q = 0.707) {
  const w = (2 * Math.PI * f) / SR;
  const a = Math.sin(w) / (2 * q);
  const cw = Math.cos(w);
  let b0: number, b1: number, b2: number;
  if (type === "lp") [b0, b1, b2] = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2];
  else if (type === "hp") [b0, b1, b2] = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2];
  else [b0, b1, b2] = [a, 0, -a];
  const a0 = 1 + a, a1 = -2 * cw, a2 = 1 - a;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const y = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y;
    x[i] = y;
  }
  return x;
}

// ── instrumentos ──
const pianoCache = new Map<string, Float32Array>();
/** Piano suave: parciais levemente inarmónicas, duas cordas desafinadas, abafador no fim da nota. */
function piano(m: number, dur: number): Float32Array {
  const key = `${m}:${dur.toFixed(3)}`;
  const hit = pianoCache.get(key);
  if (hit) return hit;
  const f = mtof(m);
  const len = S(dur + 1.4);
  const out = new Float32Array(len);
  const B = 0.00035;
  const bright = Math.min(1, 300 / f + 0.35);
  for (let n = 1; n <= 12; n++) {
    const fn = f * n * Math.sqrt(1 + B * n * n);
    if (fn > 9000) break;
    const amp = (1 / n ** 1.15) * (n === 1 ? 1 : bright);
    const dec = (0.55 + 0.5 * n) * Math.sqrt(f / 261);
    for (const det of [1, 1.0006]) {
      const w = (2 * Math.PI * fn * det) / SR;
      const ph = rnd() * Math.PI;
      for (let i = 0; i < len; i++) out[i] += Math.sin(w * i + ph) * amp * Math.exp((-dec * i) / SR) * 0.5;
    }
  }
  const off = S(dur);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let e = Math.min(1, t / 0.003);
    if (i > off) e *= Math.exp(-(i - off) / (SR * 0.12));
    out[i] *= e;
  }
  for (let i = 0; i < S(0.006); i++) out[i] += rnd() * 0.04 * (1 - i / S(0.006)); // martelo
  pianoCache.set(key, out);
  return out;
}

/** Pad de saws desafinadas, filtrado e lento, em estéreo. */
function pad(notes: number[], dur: number, cutoff = 1400): [Float32Array, Float32Array] {
  const len = S(dur + 1.6);
  const L = new Float32Array(len), R = new Float32Array(len);
  const dets = [-0.12, -0.05, 0, 0.05, 0.12];
  for (const m of notes) {
    dets.forEach((d, k) => {
      const f = mtof(m + d);
      let ph = (rnd() + 1) / 2;
      const tgt = k % 2 ? R : L;
      for (let i = 0; i < len; i++) {
        ph += f / SR;
        if (ph >= 1) ph -= 1;
        tgt[i] += (ph * 2 - 1) * 0.06;
      }
    });
  }
  for (const x of [L, R]) {
    biquad(x, "lp", cutoff, 0.6);
    biquad(x, "lp", cutoff * 1.4, 0.6);
    biquad(x, "hp", 190, 0.6); // o grave fica para o baixo
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const a = Math.min(1, t / 0.5);
      const r = t > dur ? Math.exp(-(t - dur) / 0.5) : 1;
      x[i] *= a * r;
    }
  }
  return [L, R];
}

function bass(m: number, dur: number): Float32Array {
  const f = mtof(m);
  const len = S(dur + 0.05);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.004) * (0.75 + 0.25 * Math.exp(-t * 12)) * (t > dur ? Math.exp(-(t - dur) / 0.01) : 1);
    const s = Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t);
    out[i] = Math.tanh(s * 1.4) * env * 0.5;
  }
  return biquad(out, "lp", 900);
}

function kick(): Float32Array {
  const len = S(0.5);
  const out = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (46 + 105 * Math.exp(-t * 30))) / SR;
    out[i] = Math.tanh(Math.sin(ph) * Math.exp(-t * 6.5) * 1.6) + rnd() * 0.25 * Math.exp(-t * 500);
  }
  return out;
}

function clap(): Float32Array {
  const len = S(0.35);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let e = 0;
    for (const o of [0, 0.011, 0.022]) if (t >= o) e = Math.max(e, Math.exp(-(t - o) * 190));
    if (t > 0.028) e = Math.max(e, 0.55 * Math.exp(-(t - 0.028) * 20));
    out[i] = rnd() * e;
  }
  biquad(out, "bp", 1150, 0.9);
  return biquad(out, "hp", 400);
}

function shaker(): Float32Array {
  const len = S(0.09);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    out[i] = rnd() * Math.min(1, t / 0.006) * Math.exp(-t * 55);
  }
  biquad(out, "hp", 6500);
  return out;
}

function crash(): [Float32Array, Float32Array] {
  const len = S(3.2);
  const L = new Float32Array(len), R = new Float32Array(len);
  const fs = [205.3, 283.9, 365.1, 415.2, 540.6, 800.4];
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const e = Math.exp(-t * 1.3) * Math.min(1, t / 0.002);
    let metal = 0;
    for (const f of fs) metal += Math.sign(Math.sin(2 * Math.PI * f * 3.1 * t));
    L[i] = (rnd() * 0.8 + metal * 0.06) * e;
    R[i] = (rnd() * 0.8 + metal * 0.06) * e;
  }
  biquad(L, "hp", 4200); biquad(R, "hp", 4300);
  return [L, R];
}

/** Ruído que cresce e abre o filtro até ao tempo forte seguinte (o "puxar" antes de uma capa). */
function swell(dur: number): Float32Array {
  const len = S(dur);
  const out = new Float32Array(len);
  let y = 0;
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const cf = 300 + 7000 * p * p;
    const a = 1 - Math.exp((-2 * Math.PI * cf) / SR);
    y += a * (rnd() - y);
    out[i] = y * p ** 2.2;
  }
  return out;
}

// ── harmonia ──
type Chord = { pad: number[]; keys: number[]; bass: number; pc: { r: number; n: number; t: number; f: number } };
const C: Chord = { pad: [48, 55, 60, 64], keys: [60, 64, 67], bass: 36, pc: { r: 0, n: 2, t: 4, f: 7 } };
const G: Chord = { pad: [43, 50, 55, 59], keys: [59, 62, 67], bass: 43, pc: { r: 7, n: 9, t: 11, f: 2 } };
const Am: Chord = { pad: [45, 52, 57, 60], keys: [57, 60, 64], bass: 45, pc: { r: 9, n: 11, t: 0, f: 4 } };
const F: Chord = { pad: [41, 48, 53, 57], keys: [57, 60, 65], bass: 41, pc: { r: 5, n: 7, t: 9, f: 0 } };
const PROG = [C, G, Am, F];

let lastMel = 76;
const near = (pc: number) => {
  let best = 0, bd = 99;
  for (let m = 69; m <= 86; m++) if ((m % 12) === pc && Math.abs(m - lastMel) < bd) { bd = Math.abs(m - lastMel); best = m; }
  lastMel = best;
  return best;
};
const MEL: [number, "r" | "n" | "t" | "f", number][][] = [
  [[0, "t", 3], [3, "f", 1], [4, "n", 2], [6, "r", 2]],
  [[0, "f", 2], [2, "t", 2], [4, "n", 3], [7, "t", 1]],
];

// ── arranjo ──
const drums = new Bus(), keys = new Bus(), padB = new Bus(), low = new Bus(), fx = new Bus();
const kickTimes: number[] = [];
const K = kick(), CL = clap(), SH = shaker(), CR = crash();

const slotOf = (bar: number): Placed => PLACED.find((p) => bar >= p.firstBar && bar < p.firstBar + p.bars)!;
const nextIsBig = (bar: number) => {
  const nx = PLACED.find((p) => p.firstBar === bar + 1);
  return nx && (nx.kind === "chapter" || nx.kind === "closing" || nx.kind === "rush");
};

for (let bar = 0; bar < TOTAL_BARS; bar++) {
  const p = slotOf(bar);
  const local = bar - p.firstBar;
  const t = T0 + bar * BAR_S;
  const ch = p.kind === "closing" ? C : PROG[bar % 4];
  const e8 = SPB / 2;
  const big = nextIsBig(bar);
  const groove = p.kind === "shot" || p.kind === "split" || p.kind === "builder" || p.kind === "cards";

  // pad: sempre, mais aberto quando há groove
  if (p.kind !== "closing" || local === 0) {
    const dur = p.kind === "closing" ? 5 : BAR_S;
    const [l, r] = pad(p.kind === "closing" ? [48, 55, 60, 62, 64, 67] : ch.pad, dur, groove || p.kind === "chapter" ? 2400 : 1500);
    padB.add(t, l, p.kind === "cover" ? 0.8 : 1, 0, r);
  }

  if (p.kind === "cover") {
    // arpejo de piano em colcheias, a subir
    const tones = [ch.pad[0] + 12, ch.pad[1] + 12, ch.pad[2] + 12, ch.pad[3] + 12, ch.pad[2] + 24, ch.pad[3] + 12, ch.pad[2] + 12, ch.pad[1] + 12];
    tones.forEach((m, i) => keys.add(t + i * e8, piano(m, e8 * 1.6), 0.32 + (i === 0 ? 0.1 : 0), (i % 2 ? 0.25 : -0.25)));
    if (local >= 1) for (let i = 0; i < 8; i++) drums.add(t + i * e8, SH, i % 2 ? 0.05 : 0.09, 0.3);
    if (local === p.bars - 1) fx.add(t, swell(BAR_S), 0.22);
    continue;
  }

  if (p.kind === "closing") {
    if (local === 0) {
      for (const m of [36, 48, 55, 60, 64, 67, 74, 76]) keys.add(t, piano(m, 4.5), m < 50 ? 0.45 : 0.3, (m % 3) * 0.2 - 0.2);
      drums.add(t, K, 0.9); kickTimes.push(t);
      drums.add(t, CR[0], 0.45, 0, CR[1]);
      low.add(t, bass(36, 3), 0.8);
    }
    continue;
  }

  // ── tempos com bateria ──
  const rushK = p.kind === "rush";
  const chap = p.kind === "chapter";
  const vRamp = rushK ? 0.55 + 0.15 * local : 1;

  if (chap && local === 0) drums.add(t, CR[0], 0.5, 0, CR[1]);

  for (let b = 0; b < 4; b++) {
    const tb = t + b * SPB;
    const lastBeat = big && b === 3;
    // bombo
    const kickHere = rushK ? true : chap ? (local === 0 ? b === 0 : b === 0 || b === 2) : b === 0 || b === 2;
    if (kickHere && !lastBeat) { drums.add(tb, K, 0.85 * vRamp); kickTimes.push(tb); }
    if (groove && b === 1 && bar % 2 === 1) { drums.add(tb + e8, K, 0.5); kickTimes.push(tb + e8); }
    // palmas
    if ((groove && (b === 1 || b === 3) && !lastBeat) || (chap && local === 0 && b === 2)) drums.add(tb, CL, 0.42, 0.05);
    // virada antes de uma capa: palmas em semicolcheias a crescer
    if (lastBeat && !chap) for (let k = 0; k < 4; k++) drums.add(tb + k * (SPB / 4), CL, 0.15 + k * 0.08, 0.05);
  }
  if (big) fx.add(t + 3 * SPB, swell(SPB), 0.3);

  // shaker
  if (groove || rushK || (chap && local === 1)) {
    const steps = rushK ? 16 : 8;
    for (let i = 0; i < steps; i++) drums.add(t + i * (BAR_S / steps), SH, (i % 2 ? 0.11 : 0.17) * (rushK ? 0.8 : 1), 0.3);
    if (groove) for (let i = 0; i < 8; i++) drums.add(t + i * e8 + e8 / 2, SH, 0.035, -0.3);
  }

  // baixo
  if (chap && local === 0) low.add(t, bass(ch.bass, BAR_S * 0.95), 0.8);
  else {
    const patt = [0, 0, 12, 0, 0, 0, 12, 0];
    patt.forEach((o, i) => {
      if (big && i >= 6) return;
      low.add(t + i * e8, bass(ch.bass + (rushK ? 0 : o), e8 * 0.85), (i % 2 ? 0.55 : 0.75) * (rushK ? vRamp : 1));
    });
  }

  // piano: pulso em colcheias (ou acorde longo no 1.º compasso da capa de capítulo)
  if (chap && local === 0) for (const m of ch.keys) keys.add(t, piano(m, BAR_S), 0.3);
  else {
    const acc = [1, 0.5, 0.7, 0.5, 0.9, 0.5, 0.7, 0.6];
    acc.forEach((a, i) => {
      if (big && i >= 7) return;
      for (const m of ch.keys) keys.add(t + i * e8, piano(m, e8 * 0.9), 0.17 * a, ((m % 5) - 2) * 0.15);
    });
  }

  // melodia no grave agudo, só nas cenas de conteúdo
  if (groove) {
    for (const [pos, role, len] of MEL[bar % 2]) {
      if (big && pos >= 6) continue;
      keys.add(t + pos * e8, piano(near(ch.pc[role]), len * e8 * 0.95), 0.36, 0.1);
    }
  }
  // arpejo de sinos nos cartões da segurança
  if (p.kind === "cards") {
    const up = [ch.keys[0] + 24, ch.keys[1] + 24, ch.keys[2] + 24, ch.keys[1] + 24];
    for (let i = 0; i < 16; i++) keys.add(t + i * (SPB / 4), piano(up[i % 4], SPB / 4), 0.09, i % 2 ? 0.5 : -0.5);
  }
}

// ── sidechain (tudo respira com o bombo) ──
function sidechain(bus: Bus, depth: number) {
  const g = new Float32Array(N).fill(1);
  for (const tk of kickTimes) {
    const i0 = S(tk);
    for (let i = 0; i < S(0.35); i++) {
      const j = i0 + i;
      if (j >= N) break;
      g[j] = Math.min(g[j], 1 - depth * Math.exp(-i / (SR * 0.09)));
    }
  }
  for (let i = 0; i < N; i++) { bus.L[i] *= g[i]; bus.R[i] *= g[i]; }
}
for (const x of [keys.L, keys.R]) biquad(x, "hp", 110);
sidechain(padB, 0.55);
sidechain(low, 0.35);
sidechain(keys, 0.2);

// ── reverb (Freeverb) ──
function freeverb(inL: Float32Array, inR: Float32Array, room = 0.84, damp = 0.3): [Float32Array, Float32Array] {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const aps = [556, 441, 341, 225];
  const run = (spread: number) => {
    const out = new Float32Array(N);
    const cb = combs.map((l) => ({ buf: new Float32Array(l + spread), i: 0, f: 0 }));
    const ab = aps.map((l) => ({ buf: new Float32Array(l + spread), i: 0 }));
    for (let n = 0; n < N; n++) {
      const x = (inL[n] + inR[n]) * 0.015;
      let s = 0;
      for (const c of cb) {
        const y = c.buf[c.i];
        c.f = y * (1 - damp) + c.f * damp;
        c.buf[c.i] = x + c.f * room;
        c.i = (c.i + 1) % c.buf.length;
        s += y;
      }
      for (const a of ab) {
        const b = a.buf[a.i];
        a.buf[a.i] = s + b * 0.5;
        a.i = (a.i + 1) % a.buf.length;
        s = b - s;
      }
      out[n] = s;
    }
    return out;
  };
  return [run(0), run(23)];
}
const sendL = new Float32Array(N), sendR = new Float32Array(N);
for (let i = 0; i < N; i++) {
  sendL[i] = keys.L[i] * 0.9 + padB.L[i] * 0.5 + drums.L[i] * 0.15;
  sendR[i] = keys.R[i] * 0.9 + padB.R[i] * 0.5 + drums.R[i] * 0.15;
}
const [revL, revR] = freeverb(sendL, sendR);

// ── mistura e master ──
const L = new Float32Array(N), R = new Float32Array(N);
for (let i = 0; i < N; i++) {
  L[i] = drums.L[i] * 0.85 + keys.L[i] * 1.15 + padB.L[i] * 0.55 + low.L[i] * 0.62 + fx.L[i] + revL[i] * 0.9;
  R[i] = drums.R[i] * 0.85 + keys.R[i] * 1.15 + padB.R[i] * 0.55 + low.R[i] * 0.62 + fx.R[i] + revR[i] * 0.9;
}
// alvo: RMS da parte com groove perto de -15 dBFS, depois limitador suave a -1 dBFS
const a = S(T0 + PLACED[2].firstBar * BAR_S), b = S(T0 + PLACED[PLACED.length - 1].firstBar * BAR_S);
let sum = 0;
for (let i = a; i < b; i++) sum += L[i] * L[i] + R[i] * R[i];
const rms = Math.sqrt(sum / (2 * (b - a)));
const gain = 10 ** (-15 / 20) / rms;
const ceil = 10 ** (-1 / 20);
for (let i = 0; i < N; i++) {
  L[i] = ceil * Math.tanh((L[i] * gain) / ceil);
  R[i] = ceil * Math.tanh((R[i] * gain) / ceil);
}
// fade nos últimos 1,5 s
for (let i = N - S(1.5); i < N; i++) { const g = (N - i) / S(1.5); L[i] *= g; R[i] *= g; }

// ── WAV ──
function wav(path: string, chans: Float32Array[]) {
  const n = chans[0].length, ch = chans.length;
  const buf = Buffer.alloc(44 + n * ch * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * ch * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(ch, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * ch * 2, 28); buf.writeUInt16LE(ch * 2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * ch * 2, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, chans[c][i])) * 32767), 44 + (i * ch + c) * 2);
  writeFileSync(path, buf);
}
const norm = (x: Float32Array, peakDb = -3) => {
  let p = 0;
  for (const v of x) p = Math.max(p, Math.abs(v));
  const g = 10 ** (peakDb / 20) / (p || 1);
  for (let i = 0; i < x.length; i++) x[i] *= g;
  return x;
};

mkdirSync(OUT, { recursive: true });
wav(`${OUT}/v5-trilha.wav`, [L, R]);

// ── efeitos ──
{
  // whoosh: ruído com filtro a varrer, pico aos 0,4 s (12 frames), panorâmica da esquerda para a direita
  const len = S(0.8), wl = new Float32Array(len), wr = new Float32Array(len);
  let y1 = 0, y2 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = t < 0.4 ? (t / 0.4) ** 2.5 : Math.exp(-(t - 0.4) * 9);
    const cf = 500 + 3500 * Math.exp(-(((t - 0.38) / 0.18) ** 2));
    const k = 1 - Math.exp((-2 * Math.PI * cf) / SR);
    y1 += k * (rnd() - y1); y2 += k * (y1 - y2);
    const pan = Math.min(1, t / 0.8);
    wl[i] = y2 * env * (1 - pan * 0.7); wr[i] = y2 * env * (0.3 + pan * 0.7);
  }
  const g = 10 ** (-3 / 20) / Math.max(...wl.map(Math.abs), ...wr.map(Math.abs));
  wav(`${OUT}/v5-whoosh.wav`, [wl.map((v) => v * g), wr.map((v) => v * g)]);
}
{
  // impacto: grave a descer + estalo
  const len = S(1.6), x = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (34 + 40 * Math.exp(-t * 9))) / SR;
    x[i] = Math.tanh(Math.sin(ph) * Math.exp(-t * 2.6) * 1.8) * 0.9 + rnd() * Math.exp(-t * 35) * 0.5;
  }
  biquad(x, "lp", 2500);
  wav(`${OUT}/v5-impact.wav`, [norm(x)]);
}
{
  // tick: blip curto e agudo
  const len = S(0.06), x = new Float32Array(len);
  for (let i = 0; i < len; i++) { const t = i / SR; x[i] = (Math.sin(2 * Math.PI * 2100 * t) + 0.4 * Math.sin(2 * Math.PI * 3300 * t)) * Math.exp(-t * 90); }
  wav(`${OUT}/v5-tick.wav`, [norm(x, -6)]);
}
{
  // pop: tom a descer, para blocos e cartões a encaixar
  const len = S(0.14), x = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) { const t = i / SR; ph += (2 * Math.PI * (260 + 700 * Math.exp(-t * 45))) / SR; x[i] = Math.sin(ph) * Math.exp(-t * 32) + rnd() * Math.exp(-t * 300) * 0.2; }
  wav(`${OUT}/v5-pop.wav`, [norm(x, -4)]);
}

console.log(`v5-trilha.wav: ${LEN.toFixed(1)} s, ${TOTAL_BARS} compassos a 120 BPM. Efeitos: whoosh, impact, tick, pop.`);
