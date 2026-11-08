// Geração pura e determinística para a cena `dark3d`: PRNG com semente, posições e limites.
// Nada aqui lê relógio, Math.random ou estado: mesma semente, mesmas posições, em qualquer quadro.

/** Teto de partículas por cena (o contrato da cena exige menos de 20 mil). */
export const MAX_PARTICLES = 19000;
/** Teto de luzes por cena (o contrato exige menos de 4; a cena usa ambiente + 2 pontuais). */
export const MAX_LIGHTS = 3;

export const DARK_DEFAULTS = {
  bg: "#07090d",
  light: "#5fa8b8",
  text: "#e8edf2",
  muted: "#aab4be",
  seed: 7,
  corredor: { fog: 0.09, speed: 1.2, depth: 60, ribs: 24, width: 3.2, height: 2.6 },
  poeira: { fog: 0.035, speed: 0.6, count: 4000, size: 0.035, drift: 0.25, spread: [16, 10, 24] as const },
  vazio: { fog: 0.12, speed: 0.4, count: 320, size: 0.03, drift: 0.12 },
} as const;

/** PRNG mulberry32: devolve números em [0, 1). */
export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Contagem de partículas dentro de [0, MAX_PARTICLES] (inteiro; inválido vira o padrão). */
export const clampCount = (n: number | undefined, fallback: number) => {
  const v = n === undefined || !Number.isFinite(n) ? fallback : Math.round(n);
  return Math.max(0, Math.min(MAX_PARTICLES, v));
};

/** Posições (x,y,z em sequência) de `count` pontos numa caixa centrada em x,y e com z em [-spread[2], 0]. */
export const particlePositions = (seed: number, count: number, spread: readonly [number, number, number]): Float32Array => {
  const n = clampCount(count, 0);
  const rnd = mulberry32(seed);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    out[i * 3] = (rnd() - 0.5) * spread[0];
    out[i * 3 + 1] = (rnd() - 0.5) * spread[1];
    out[i * 3 + 2] = -rnd() * spread[2];
  }
  return out;
};

export type Bar = { x: number; y: number; z: number; sx: number; sy: number; sz: number };

/**
 * Barras das nervuras do corredor: 4 por nervura (esquerda, direita, teto, chão), uma a cada `depth / ribs`
 * em z, com variação pequena de espessura e de largura por semente.
 */
export const ribBars = (seed: number, ribs: number, depth: number, width: number, height: number): Bar[] => {
  const n = Math.max(1, Math.min(200, Math.round(ribs)));
  const step = depth / n;
  const rnd = mulberry32(seed);
  const bars: Bar[] = [];
  for (let i = 0; i < n; i++) {
    const z = -i * step;
    const th = 0.1 + rnd() * 0.12;
    const w = width * (0.94 + rnd() * 0.12);
    const h = height * (0.94 + rnd() * 0.12);
    const len = 0.18 + rnd() * 0.2;
    bars.push({ x: -w, y: 0, z, sx: th, sy: h * 2 + th, sz: len });
    bars.push({ x: w, y: 0, z, sx: th, sy: h * 2 + th, sz: len });
    bars.push({ x: 0, y: h, z, sx: w * 2 + th, sy: th, sz: len });
    bars.push({ x: 0, y: -h, z, sx: w * 2 + th, sy: th, sz: len });
  }
  return bars;
};

/** Cintilação de luz por seno, em torno de 1 (amplitude `amp`), só em função do quadro. */
export const flicker = (frame: number, fps: number, seed: number, amp = 0.18) => {
  const t = frame / fps;
  const ph = (seed % 97) * 0.37;
  return 1 + amp * (0.6 * Math.sin(t * 7.3 + ph) + 0.4 * Math.sin(t * 17.1 + ph * 2.1));
};

/** Avanço da câmera em unidades de mundo no quadro, linear no tempo. */
export const travel = (frame: number, fps: number, speed: number) => (frame / fps) * speed * 4;
