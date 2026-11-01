// Revisão automática do vídeo renderizado (pnpm video qc / fim do render). Leitura da saída do ffmpeg é pura.
export type Span = { start: number; end: number };
/** Trecho "preto" com o brilho máximo de um quadro do meio (signalstats YMAX, 0 a 255): texto claro sobre fundo escuro não é tela preta. */
export type BlackSpan = Span & { ymax?: number };
/** Acima disso há conteúdo visível no quadro (texto, logo), não é tela preta. */
export const CONTENT_YMAX = 100;
export type QcInput = {
  /** duração, tamanho e se há áudio (ffprobe) */
  probe: { duration: number; width: number; height: number; audio: boolean };
  /** continuous: há trilha ou locução (só então silêncio e loudness contam; efeitos soltos têm pausas naturais) */
  expect: { duration: number; width: number; height: number; audio: boolean; continuous?: boolean };
  black: BlackSpan[];
  frozen: Span[];
  silent: Span[];
  /** loudness integrada (LUFS), se houver áudio */
  lufs?: number;
};

const spans = (text: string, startKey: string, endKey: string): Span[] => {
  const out: Span[] = [];
  let start: number | null = null;
  for (const m of text.matchAll(new RegExp(`(${startKey}|${endKey})[:=]\\s*(-?[\\d.]+)`, "g"))) {
    const v = Number(m[2]);
    if (m[1] === startKey) start = v;
    else if (start !== null) { out.push({ start, end: v }); start = null; }
  }
  if (start !== null) out.push({ start, end: Infinity });
  return out;
};
/** blackdetect: "black_start:1.2 black_end:2.0" */
export const parseBlack = (stderr: string) => spans(stderr, "black_start", "black_end");
/** freezedetect: "lavfi.freezedetect.freeze_start: 3.1" … "freeze_end: 6" */
export const parseFrozen = (stderr: string) => spans(stderr, "freeze_start", "freeze_end");
/** silencedetect: "silence_start: 1.5" … "silence_end: 4 | silence_duration: 2.5" */
export const parseSilence = (stderr: string) => spans(stderr, "silence_start", "silence_end");
/** ebur128: último "I: -14.3 LUFS" (o resumo) */
export const parseLufs = (stderr: string) => {
  const all = [...stderr.matchAll(/I:\s+(-?[\d.]+) LUFS/g)];
  return all.length ? Number(all.at(-1)![1]) : undefined;
};

const fmt = (s: number) => `${s.toFixed(1)} s`;
const span = (s: Span, total: number) => `${fmt(s.start)} a ${fmt(Math.min(s.end, total))}`;

/** Problemas (bloqueiam a entrega) e avisos (vale olhar). */
export const review = (q: QcInput) => {
  const problems: string[] = [];
  const warnings: string[] = [];
  const { probe, expect } = q;
  if (probe.width !== expect.width || probe.height !== expect.height) problems.push(`resolução ${probe.width}x${probe.height}, esperada ${expect.width}x${expect.height}`);
  if (Math.abs(probe.duration - expect.duration) > 0.25) problems.push(`duração ${fmt(probe.duration)}, esperada ${fmt(expect.duration)}`);
  if (expect.audio && !probe.audio) problems.push("sem trilha de áudio");
  // preto: tolera o fade do início e do fim
  for (const b of q.black) {
    if (b.start <= 0.3 || Math.min(b.end, probe.duration) >= probe.duration - 0.3) continue;
    // fundo escuro com texto ou logo: não é preto, mas o quadro está quase vazio
    if (b.ymax !== undefined && b.ymax >= CONTENT_YMAX) warnings.push(`quadro escuro e quase vazio de ${span(b, probe.duration)}`);
    else problems.push(`tela preta de ${span(b, probe.duration)}`);
  }
  // quadro parado por muito tempo = cara de slideshow ou mídia que não carregou
  for (const f of q.frozen) warnings.push(`imagem parada de ${span(f, probe.duration)} (${fmt(Math.min(f.end, probe.duration) - f.start)})`);
  if (expect.continuous) {
    for (const s of q.silent) if (Math.min(s.end, probe.duration) - s.start >= 2) warnings.push(`silêncio de ${span(s, probe.duration)}`);
    if (q.lufs !== undefined && (q.lufs > -13 || q.lufs < -17)) warnings.push(`loudness ${q.lufs} LUFS (alvo -14 a -16)`);
  }
  return { problems, warnings };
};

/** Quatro pontos para extrair quadros (início, dois meios, fim). */
/** signalstats: último "lavfi.signalstats.YMAX=235" */
export const parseYmax = (stderr: string) => {
  const all = [...stderr.matchAll(/signalstats\.YMAX=(\d+(?:\.\d+)?)/g)];
  return all.length ? Number(all.at(-1)![1]) : undefined;
};

export const samplePoints = (duration: number) => [0.1, 0.37, 0.63, 0.9].map((f) => Number((duration * f).toFixed(2)));
