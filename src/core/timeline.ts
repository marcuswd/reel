// Planejamento do vídeo (puro, sem React): durações, cortes, efeitos, locução e legendas.
// A composição (calculateMetadata e cenas) e os scripts (trilha gerada, export de .srt)
// usam esta mesma função, então vídeo, música e efeitos compartilham os mesmos frames.
import type { CaptionItem, Job, Scene, VideoProps } from "./schema";

export type Transition = Exclude<Job["defaults"]["transition"], undefined>;
export type Camera = Exclude<Job["defaults"]["camera"], undefined>;

export type SfxEvent = { frame: number; name: string; volume: number };
export type PlannedScene = {
  id: string;
  index: number;
  scene: Scene;
  /** frame global em que a cena começa a entrar (início da transição) */
  start: number;
  /** frame global em que a transição termina e a cena "assenta" */
  land: number;
  /** duração da Sequence (inclui a transição de entrada) */
  frames: number;
  transition: Transition;
  camera: Camera;
  /** frame LOCAL em que a locução começa */
  voiceAt: number;
  /** eventos locais (relativos ao início da cena) que pedem efeito sonoro */
  events: { at: number; kind: string }[];
};

export type Plan = {
  fps: number;
  bpm: number | null;
  beat: number; // frames por tempo (pode ser fracionário)
  T: number; // frames de cada transição
  total: number;
  scenes: PlannedScene[];
  sfx: SfxEvent[];
  /** trechos com fala (frames globais), para ducking da trilha */
  speech: { from: number; to: number }[];
  /** legendas globais (ms), já com offsets: vão para o .srt/.vtt */
  captions: CaptionItem[];
  /** legendas queimadas no vídeo: sem as cenas cuja fala já está escrita na tela */
  burn: CaptionItem[];
};

// ── Texto ──
export const stripMarks = (s: string) => s.replace(/[[\]]/g, "");
export const countWords = (...texts: (string | undefined)[]) =>
  texts.filter(Boolean).join(" ").replace(/[[\]]/g, "").split(/\s+/).filter(Boolean).length;

/** Textos visíveis de uma cena. */
export const sceneTexts = (s: Scene): (string | undefined)[] => {
  switch (s.type) {
    case "cover": return [s.eyebrow, s.title, s.subtitle];
    case "statement": return [s.eyebrow, s.text];
    case "media": return [s.eyebrow, s.title, s.text];
    case "split": return [s.eyebrow, s.title, s.text, ...(s.bullets ?? [])];
    case "screen": return [s.eyebrow, s.title, s.text];
    case "list": return [s.eyebrow, s.title, ...s.items];
    case "stats": return [s.eyebrow, s.title, ...s.items.flatMap((i) => [`${i.prefix ?? ""}${i.value}${i.suffix ?? ""}`, i.label])];
    case "gallery": return [s.eyebrow, s.title];
    case "quote": return [s.text, s.author, s.role];
    case "cta": return [s.eyebrow, s.title, s.text, s.button, ...(s.contact ?? []).map((c) => c.value)];
    case "logo": return [s.tagline];
  }
};

/** Palavras visíveis de uma cena (o que precisa de tempo de leitura). */
export const sceneWords = (s: Scene): number => countWords(...sceneTexts(s));

const norm = (w: string) => w.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]/gu, "");
/** Fração das palavras faladas que já estão escritas na tela (0 a 1). */
export const onScreenShare = (spoken: string[], s: Scene) => {
  const seen = new Set(sceneTexts(s).filter(Boolean).join(" ").split(/\s+/).map(norm).filter(Boolean));
  const said = spoken.map(norm).filter(Boolean);
  return said.length ? said.filter((w) => seen.has(w)).length / said.length : 0;
};
/** A partir desta fração, a legenda da locução repetiria a tela e não é queimada. */
export const ON_SCREEN = 0.6;

const MIN_SECONDS: Record<Scene["type"], number> = {
  cover: 2.6, statement: 2.4, media: 3, split: 3.5, screen: 4.5, list: 3, stats: 3.6, gallery: 3.2, quote: 4, cta: 4, logo: 2.6,
};
const WPS = { calm: 2.5, normal: 3, fast: 3.6 } as const;

/** Tempo de leitura: entrada + palavras ÷ ritmo + respiro, nunca abaixo do mínimo do tipo. */
export const readingSeconds = (s: Scene, pace: Job["pace"]) => {
  const extra = s.type === "list" ? s.items.length * 0.35 : s.type === "gallery" ? s.items.length * 0.45 : s.type === "stats" ? s.items.length * 0.3 : 0;
  return Math.max(MIN_SECONDS[s.type], 1.2 + sceneWords(s) / WPS[pace] + 1.0 + extra);
};

// ── Tempos internos das cenas (as cenas usam os mesmos números) ──
/** Atraso entre itens (listas, galerias, números) em frames. */
export const itemStagger = (n: number, fps: number) => Math.round(fps * Math.max(0.28, Math.min(0.7, 2.4 / Math.max(1, n))));
/** Frame local (desde o assentar) em que o item i entra. */
export const itemAt = (i: number, n: number, fps: number) => Math.round(fps * 0.5) + i * itemStagger(n, fps);

const sceneEvents = (s: Scene, land: number, fps: number): { at: number; kind: string }[] => {
  switch (s.type) {
    case "cover": return [{ at: land, kind: s.logo ? "impact" : "hit-soft" }];
    case "logo": return [{ at: land + Math.round(fps * 0.2), kind: "impact" }];
    case "list": return s.items.map((_, i) => ({ at: land + itemAt(i, s.items.length, fps), kind: "pop" }));
    case "gallery": return s.items.map((_, i) => ({ at: land + itemAt(i, s.items.length, fps), kind: "pop-soft" }));
    case "stats": return s.items.map((_, i) => ({ at: land + itemAt(i, s.items.length, fps), kind: "tick" }));
    case "screen": return s.focus ? [{ at: land + Math.round(fps * 1.2), kind: "click" }] : [];
    case "cta": return [{ at: land + Math.round(fps * 0.9), kind: "chime" }];
    default: return [];
  }
};

// ── Escolhas automáticas ──
const AUTO_TRANSITIONS = {
  calm: ["fade", "dive", "lift", "leak"],
  normal: ["slide", "lift", "zoom", "bands", "dive", "push"],
  playful: ["bubble", "whip", "zoom", "bands", "push", "bubble"],
} as const;

export const pickTransition = (props: VideoProps, s: Scene, i: number): Transition => {
  if (i === 0) return "none";
  const t = s.transition ?? props.job.defaults.transition ?? "auto";
  if (t !== "auto") return t;
  const list = (props.brand.motion.transitions.length ? props.brand.motion.transitions : AUTO_TRANSITIONS[props.brand.motion.energy]) as Transition[];
  if (s.type === "cta" || s.type === "logo") return list.includes("iris" as Transition) ? "iris" : list[0];
  return list[(i - 1) % list.length];
};

const AUTO_CAMERA: Camera[] = ["in", "left", "out", "right", "push", "up", "orbit", "dolly"];
export const pickCamera = (props: VideoProps, s: Scene, i: number): Camera => {
  const c = s.camera ?? props.job.defaults.camera ?? "auto";
  if (c !== "auto") return c;
  if (s.type === "gallery" || s.type === "stats") return "static";
  return AUTO_CAMERA[i % AUTO_CAMERA.length];
};

const TRANSITION_SFX: Partial<Record<Transition, string>> = {
  slide: "whoosh", push: "whoosh", whip: "whoosh", zoom: "whoosh-2", wipe: "swoosh", bands: "swoosh", bubble: "swoosh",
  lift: "whoosh-soft", dive: "whoosh-soft", fade: "whoosh-soft", leak: "whoosh-soft", flip: "whoosh-2", glitch: "glitch", iris: "pop-soft",
};
const EVENT_VOL: Record<string, number> = { impact: 0.55, "hit-soft": 0.4, pop: 0.38, "pop-soft": 0.3, tick: 0.25, click: 0.4, chime: 0.45 };
/** frames entre o início do arquivo e o pico (para alinhar o pico ao corte) */
const SFX_PEAK: Record<string, number> = { whoosh: 6, "whoosh-2": 6, "whoosh-soft": 8, swoosh: 5, glitch: 1, riser: 45 };

// ── Plano ──
export const planTimeline = (props: VideoProps): Plan => {
  const { job } = props;
  const fps = job.fps;
  const bpm = job.music.mode === "none" ? null : (job.music.bpm ?? props.brand.audio.bpm ?? null);
  const beat = bpm ? (fps * 60) / bpm : fps / 2;
  const T = Math.max(10, Math.min(20, Math.round(beat)));

  // Duração "útil" de cada cena (do assentar até o próximo corte), em tempos da música.
  const VOICE_LEAD = Math.round(fps * 0.25);
  const usable = job.scenes.map((s) => {
    const read = readingSeconds(s, job.pace);
    const v = props.voice[s.id];
    let sec = s.duration ?? (v ? Math.max(MIN_SECONDS[s.type], read * 0.7, VOICE_LEAD / fps + v.seconds + 0.55) : read);
    // vídeo com áudio próprio: a cena dura o clipe (até 60 s)
    if (s.type === "media" && typeof s.media !== "string" && s.media.muted === false && !s.duration) sec = Math.max(sec, 3);
    return Math.max(1, Math.ceil((sec * fps) / beat - 0.2)); // em tempos
  });

  const scenes: PlannedScene[] = [];
  let cum = 0;
  job.scenes.forEach((s, i) => {
    const land = Math.round(T + cum * beat);
    cum += usable[i];
    const next = Math.round(T + cum * beat);
    const start = land - T;
    const frames = next - start;
    scenes.push({
      id: s.id, index: i, scene: s, start, land, frames,
      transition: pickTransition(props, s, i),
      camera: pickCamera(props, s, i),
      voiceAt: T + VOICE_LEAD,
      events: sceneEvents(s, T, fps),
    });
  });
  const total = scenes.length ? scenes[scenes.length - 1].start + scenes[scenes.length - 1].frames : 1;

  // Efeitos sonoros
  const sfx: SfxEvent[] = [];
  if (job.sfx.enabled) {
    for (const p of scenes) {
      const t = TRANSITION_SFX[p.transition];
      if (t && p.index > 0) sfx.push({ frame: p.start + Math.round(T / 2) - (SFX_PEAK[t] ?? 0), name: t, volume: t.includes("soft") ? 0.35 : 0.42 });
      for (const e of p.events) sfx.push({ frame: p.start + e.at, name: e.kind, volume: EVENT_VOL[e.kind] ?? 0.4 });
      if (p.scene.sfx) sfx.push({ frame: p.land, name: p.scene.sfx, volume: 0.5 });
      if ((p.scene.type === "cta" || p.scene.type === "logo") && p.index > 0 && p.index === scenes.length - 1) {
        sfx.push({ frame: p.start + Math.round(T / 2) - SFX_PEAK.riser, name: "riser", volume: 0.3 });
      }
    }
    sfx.sort((a, b) => a.frame - b.frame);
    // no máximo um efeito a cada ~0,25 s (mantém o mais forte)
    const minGap = Math.round(fps * 0.25);
    for (let i = sfx.length - 1; i > 0; i--) {
      if (sfx[i].frame - sfx[i - 1].frame < minGap && sfx[i].name !== "riser" && sfx[i - 1].name !== "riser") {
        if (sfx[i].volume > sfx[i - 1].volume) sfx.splice(i - 1, 1);
        else sfx.splice(i, 1);
      }
    }
  }

  // Fala e legendas
  const speech: Plan["speech"] = [];
  const captions: CaptionItem[] = [];
  const burn: CaptionItem[] = [];
  const burnMode = job.captions.mode === "burn" || job.captions.mode === "both";
  const ms = (f: number) => (f / fps) * 1000;
  for (const p of scenes) {
    const v = props.voice[p.id];
    if (v) {
      const from = p.start + p.voiceAt;
      speech.push({ from, to: from + Math.ceil(v.seconds * fps) });
      const ws = v.words.map((w) => ({ ...w, startMs: w.startMs + ms(from), endMs: w.endMs + ms(from), timestampMs: w.timestampMs === null ? null : w.timestampMs + ms(from) }));
      captions.push(...ws);
      const repeats = job.captions.whenOnScreen === "hide" && onScreenShare(v.words.map((w) => w.text), p.scene) >= ON_SCREEN;
      if (burnMode && !repeats) burn.push(...ws);
    }
    const clip = props.clipCaptions[p.id];
    if (clip && p.scene.type === "media" && typeof p.scene.media !== "string") {
      const off = ms(p.start) - (p.scene.media.trim ?? 0) * 1000;
      const endMs = ms(p.start + p.frames);
      speech.push({ from: p.start, to: p.start + p.frames });
      for (const w of clip) {
        const c = { ...w, startMs: w.startMs + off, endMs: w.endMs + off, timestampMs: w.timestampMs === null ? null : w.timestampMs + off };
        if (c.startMs >= ms(p.start) && c.startMs < endMs) {
          captions.push(c);
          if (burnMode) burn.push(c);
        }
      }
    }
  }

  return { fps, bpm, beat, T, total, scenes, sfx, speech, captions, burn };
};

/** Resumo serializável para o gerador de trilha (scripts/music.py). */
export const musicBrief = (props: VideoProps, plan: Plan) => ({
  fps: plan.fps,
  bpm: plan.bpm ?? 110,
  offsetFrames: plan.T, // o primeiro tempo forte cai no primeiro "assentar"
  totalFrames: plan.total,
  mood: props.job.music.mood ?? props.brand.audio.mood,
  energy: props.brand.motion.energy,
  hasVoice: plan.speech.length > 0,
  scenes: plan.scenes.map((s) => ({ id: s.id, type: s.scene.type, land: s.land, end: s.start + s.frames })),
});
