// Normalização de loudness da entrega (ffmpeg loudnorm em duas passadas). Leitura e montagem do filtro são puras.

/** Alvo das redes sociais: -15 LUFS integrado, pico real -1,5 dBTP (o QC aceita -14 a -16). */
export const TARGET = { I: -15, TP: -1.5, LRA: 11 };

export type Measured = { input_i: string; input_tp: string; input_lra: string; input_thresh: string; target_offset: string };

/** O loudnorm imprime um bloco JSON no fim da 1ª passada; pega o último. */
export const parseLoudnorm = (stderr: string): Measured | null => {
  const blocks = stderr.match(/\{[^{}]*"input_i"[^{}]*\}/g);
  if (!blocks) return null;
  try {
    const m = JSON.parse(blocks.at(-1)!) as Measured;
    return [m.input_i, m.input_tp, m.input_lra, m.input_thresh].every((v) => Number.isFinite(Number(v))) ? m : null;
  } catch {
    return null;
  }
};

/** Filtro da 1ª passada (só mede). */
export const measureFilter = () => `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}:print_format=json`;

/** Filtro da 2ª passada, com o que a 1ª mediu (linear quando der, para não mexer na dinâmica da mixagem). */
export const applyFilter = (m: Measured) =>
  `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;

/** Já está dentro da faixa do QC com folga? Então não precisa mexer. */
export const withinTarget = (m: Measured) => Math.abs(Number(m.input_i) - TARGET.I) <= 0.5 && Number(m.input_tp) <= -1;
