// Timeline da v5 em compassos. Sem React nem Remotion: o gerador da trilha
// (scripts/trilha-v5.ts) importa este ficheiro, por isso vídeo e música
// partilham exactamente os mesmos tempos.
//
// 120 BPM a 30 fps: 1 tempo = 15 frames, 1 compasso = 60 frames (2 s).
// Cada cena dura N compassos + T e as transições duram T (1 tempo), logo
// toda cena nova "assenta" (fim da transição) num tempo forte da música.
import { chapters, closing, cover, rush } from "./content";

export const FPS = 30;
export const BPM = 120;
export const BEAT = (FPS * 60) / BPM; // 15
export const BAR = BEAT * 4; // 60
export const T = BEAT; // frames de cada transição

/** Frame local (dentro da cena) do tempo `b`, contado a partir do momento em que a cena assenta. */
export const beatAt = (b: number) => T + Math.round(b * BEAT);

// Tempos (a partir do assentar) em que cada elemento entra: os mesmos números servem o vídeo e os efeitos.
export const RUSH_TITLE_BEAT = 0;
export const RUSH_BEATS = rush.names.map((_, i) => 2 + i); // 2..9
export const BUILDER_BEATS = [3, 4, 5, 6, 7, 8]; // blocos a encaixar
export const CARD_BEATS = [3, 5, 7, 9]; // cartões da segurança

export type Transition = "dive" | "lift" | "bands" | "iris";
export type Kind = "cover" | "rush" | "chapter" | "shot" | "split" | "builder" | "cards" | "closing";
export type Slot = {
  id: string;
  kind: Kind;
  bars: number;
  enter: Transition | null;
  chapter?: number;
  /** Tempos (desde o assentar) com um "tick" de efeito. */
  ticks: number[];
};

const words = (...t: string[]) => t.join(" ").replace(/[[\]]/g, "").split(/\s+/).filter(Boolean).length;
/** Compassos para ler: entrada + palavras ÷ 3 por segundo + respiro, arredondado para cima ao compasso. */
const readBars = (n: number, min: number, entry = 1.4, rest = 0.6) => Math.max(min, Math.ceil(((entry + n / 3 + rest) * FPS) / BAR - 0.15));

export const SLOTS: Slot[] = [
  { id: "Capa", kind: "cover", bars: readBars(words(cover.title, cover.support), 3, 2), enter: null, ticks: [] },
  { id: "Novidades", kind: "rush", bars: 3, enter: "dive", ticks: RUSH_BEATS },
  ...chapters.flatMap((ch, ci): Slot[] => {
    const b = ch.beat;
    const n =
      b.kind === "shot" ? words(b.title, b.text) : b.kind === "cards" ? words(b.title, ...b.cards.flatMap((x) => [x.name, x.text])) / 2 : words(b.title, ...b.items);
    return [
      { id: `${ch.number} ${ch.title}`, kind: "chapter", bars: 2, enter: "bands", chapter: ci, ticks: [] },
      {
        id: `${ch.number}.1 ${b.title.replace(/[[\]]/g, "")}`,
        kind: b.kind,
        bars: readBars(n, b.kind === "builder" || b.kind === "cards" ? 4 : 3),
        enter: ci % 2 ? "dive" : "lift",
        chapter: ci,
        ticks: b.kind === "builder" ? BUILDER_BEATS : b.kind === "cards" ? CARD_BEATS : [],
      },
    ];
  }),
  { id: "Fecho", kind: "closing", bars: readBars(words(closing.title, closing.line, closing.cta), 3, 1.8), enter: "iris", ticks: [] },
];

export type Placed = Slot & { start: number; land: number; frames: number; firstBar: number };

/** Início (frame), assentar (frame), duração e primeiro compasso de cada cena. */
export const PLACED: Placed[] = (() => {
  let bar = 0;
  return SLOTS.map((s) => {
    const start = bar * BAR; // a cena entra 1 tempo antes do compasso
    const p = { ...s, start, land: start + T, frames: s.bars * BAR + T, firstBar: bar };
    bar += s.bars;
    return p;
  });
})();

export const TOTAL_BARS = SLOTS.reduce((n, s) => n + s.bars, 0);
/** Duração do vídeo: todos os compassos + o tempo de entrada antes do primeiro. */
export const CMS_TIS_V5_DURATION = TOTAL_BARS * BAR + T;
