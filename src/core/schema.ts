// Contrato de dados do gerador: marca (brands/*.json), job (jobs/<slug>/job.json)
// e as props resolvidas que a composição recebe. Sem React: os scripts (tsx) importam este arquivo.
import { z } from "zod";

const color = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "cor hex");

// ── Marca ──
export const fontSchema = z.object({
  family: z.string(),
  /** peso -> arquivo em public/ (woff2). Gerado por `pnpm video brand:font`. */
  files: z.record(z.string(), z.string()).default({}),
  /** multiplica o tamanho (fontes condensadas pedem ~1.3) */
  scale: z.number().default(1),
  uppercase: z.boolean().default(false),
});

export const brandSchema = z.object({
  slug: z.string(),
  name: z.string(),
  colors: z.object({
    bg: color, // fundo principal (escuro ou claro)
    bg2: color, // segunda cor do gradiente de fundo
    surface: color, // cartões
    text: color, // texto sobre bg
    textOnSurface: color, // texto sobre surface
    muted: color, // texto secundário
    primary: color, // botões, elementos fortes
    accent: color, // detalhes
    highlight: color, // palavras entre [colchetes]
    palette: z.array(color).min(2), // transições, partículas, gráficos
  }),
  fonts: z.object({ heading: fontSchema, body: fontSchema }),
  logo: z
    .object({
      light: z.string().optional(), // versão para fundo escuro
      dark: z.string().optional(), // versão para fundo claro
      mark: z.string().optional(), // símbolo isolado
      /** fundo atrás da logo quando ela não contrasta (ex.: logo colorida sobre fundo escuro) */
      plate: z.enum(["none", "circle", "rounded"]).default("none"),
      plateColor: color.optional(),
      /** altura máxima em px de design (logos raster pequenas não ficam borradas) */
      maxHeight: z.number().optional(),
    })
    .default({ plate: "none" }),
  shape: z
    .object({
      radius: z.number().default(28),
      style: z.enum(["round", "square"]).default("round"),
      /** destaque de [palavras]: cor do texto ou fundo "marca-texto" (bom em fundo claro com cor de destaque clara) */
      highlight: z.enum(["color", "marker"]).default("color"),
    })
    .default({ radius: 28, style: "round", highlight: "color" }),
  motion: z
    .object({
      energy: z.enum(["calm", "normal", "playful"]).default("normal"),
      transitions: z.array(z.string()).default([]),
      background: z.string().optional(),
    })
    .default({ energy: "normal", transitions: [] }),
  audio: z.object({ mood: z.string().default("corporate"), bpm: z.number().default(110) }).default({ mood: "corporate", bpm: 110 }),
  contact: z
    .object({ whatsapp: z.string().optional(), phone: z.string().optional(), site: z.string().optional(), instagram: z.string().optional(), email: z.string().optional() })
    .default({}),
});
export type Brand = z.infer<typeof brandSchema>;

// ── Mídia ──
export const focusSchema = z.object({ x: z.number(), y: z.number(), w: z.number().optional(), h: z.number().optional() });
export const mediaObj = z.object({
  src: z.string(), // caminho em public/ ou URL
  kind: z.enum(["image", "video"]).optional(), // inferido pela extensão
  focus: focusSchema.optional(), // ponto de interesse (frações 0..1)
  fit: z.enum(["cover", "contain"]).optional(),
  trim: z.number().optional(), // vídeo: segundos a pular no início
  muted: z.boolean().optional(), // vídeo: false = usa o áudio do clipe
  captions: z.string().optional(), // vídeo falado: json de legendas (pnpm video transcribe)
  credit: z.string().optional(),
});
export const mediaSchema = z.union([z.string(), mediaObj]);
export type MediaInput = z.infer<typeof mediaSchema>;
export type MediaObj = z.infer<typeof mediaObj>;

export const CAMERA_MOVES = [
  "auto", "static", "in", "out", "left", "right", "up", "down", "push", "pull", "orbit", "tilt", "handheld", "dolly", "whip",
] as const;
export const TRANSITIONS = [
  "auto", "none", "fade", "slide", "push", "wipe", "zoom", "whip", "lift", "dive", "iris", "bands", "bubble", "leak", "glitch", "flip",
] as const;
export const BACKGROUNDS = ["auto", "solid", "gradient", "mesh", "particles", "grid", "shapes", "aurora"] as const;

export const backgroundSchema = z.union([
  z.enum(BACKGROUNDS),
  z.object({ type: z.enum(BACKGROUNDS), colors: z.array(color).optional(), media: mediaSchema.optional(), dim: z.number().optional() }),
  z.object({ type: z.literal("media"), media: mediaSchema, dim: z.number().optional(), camera: z.enum(CAMERA_MOVES).optional() }),
]);
export type BackgroundInput = z.infer<typeof backgroundSchema>;

// ── Cenas ──
const base = {
  id: z.string(),
  /** Texto da locução desta cena (TTS). Sem ele, a cena dura o tempo de leitura. */
  voice: z.string().optional(),
  /** Força a duração em segundos. */
  duration: z.number().optional(),
  transition: z.enum(TRANSITIONS).optional(), // transição de ENTRADA
  camera: z.enum(CAMERA_MOVES).optional(),
  background: backgroundSchema.optional(),
  /** Efeito sonoro extra no "assentar" da cena (nome do arquivo no pack, sem extensão). */
  sfx: z.string().optional(),
};

export const sceneSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("cover"), eyebrow: z.string().optional(), title: z.string(), subtitle: z.string().optional(), logo: z.boolean().optional(), media: mediaSchema.optional() }),
  z.object({ ...base, type: z.literal("statement"), eyebrow: z.string().optional(), text: z.string(), align: z.enum(["center", "left"]).optional() }),
  z.object({ ...base, type: z.literal("media"), media: mediaSchema, eyebrow: z.string().optional(), title: z.string().optional(), text: z.string().optional(), position: z.enum(["bottom", "center", "top"]).optional() }),
  z.object({ ...base, type: z.literal("split"), media: mediaSchema, eyebrow: z.string().optional(), title: z.string(), text: z.string().optional(), bullets: z.array(z.string()).optional(), side: z.enum(["left", "right"]).optional() }),
  z.object({ ...base, type: z.literal("screen"), src: z.string(), device: z.enum(["browser", "phone", "none"]).optional(), focus: focusSchema.optional(), pan: z.boolean().optional(), eyebrow: z.string().optional(), title: z.string().optional(), text: z.string().optional() }),
  z.object({ ...base, type: z.literal("list"), eyebrow: z.string().optional(), title: z.string(), items: z.array(z.string()).min(1), icon: z.enum(["check", "number", "dot"]).optional(), media: mediaSchema.optional() }),
  z.object({ ...base, type: z.literal("stats"), eyebrow: z.string().optional(), title: z.string().optional(), items: z.array(z.object({ value: z.number(), prefix: z.string().optional(), suffix: z.string().optional(), decimals: z.number().optional(), label: z.string() })).min(1) }),
  z.object({ ...base, type: z.literal("gallery"), eyebrow: z.string().optional(), title: z.string().optional(), items: z.array(mediaSchema).min(2), layout: z.enum(["grid", "carousel", "stack"]).optional() }),
  z.object({ ...base, type: z.literal("quote"), text: z.string(), author: z.string(), role: z.string().optional(), avatar: z.string().optional() }),
  z.object({ ...base, type: z.literal("cta"), eyebrow: z.string().optional(), title: z.string(), text: z.string().optional(), button: z.string().optional(), contact: z.array(z.object({ kind: z.enum(["whatsapp", "phone", "site", "instagram", "email"]), value: z.string() })).optional(), logo: z.boolean().optional() }),
  z.object({ ...base, type: z.literal("logo"), tagline: z.string().optional() }),
]);
export type Scene = z.infer<typeof sceneSchema>;
export type SceneType = Scene["type"];

export const FORMATS = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080], "4:5": [1080, 1350] } as const;
export type FormatKey = keyof typeof FORMATS;

// ── Job (o que você escreve) ──
export const jobSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().optional(),
  client: z.string().optional(), // pasta em clientes/<client>
  brand: z.string(), // brands/<brand>.json
  lang: z.string().default("pt-BR"), // idioma do roteiro original
  langs: z.array(z.string()).optional(), // idiomas a renderizar (jobs/<slug>/i18n/<lang>.json)
  formats: z.array(z.enum(Object.keys(FORMATS) as [FormatKey, ...FormatKey[]])).default(["16:9"]),
  fps: z.number().default(30),
  /** Ritmo: "calm" alonga, "fast" encurta o tempo de leitura. */
  pace: z.enum(["calm", "normal", "fast"]).default("normal"),
  music: z
    .object({
      mode: z.enum(["generate", "file", "none"]).default("generate"),
      file: z.string().optional(),
      mood: z.string().optional(), // upbeat | corporate | tech | calm | epic
      bpm: z.number().optional(),
      volume: z.number().default(0.9),
    })
    .default({ mode: "generate", volume: 0.9 }),
  sfx: z.object({ enabled: z.boolean().default(true), pack: z.string().default("_lib/sfx"), volume: z.number().default(1) }).default({ enabled: true, pack: "_lib/sfx", volume: 1 }),
  voice: z
    .object({ provider: z.enum(["none", "elevenlabs", "openai", "piper"]).default("none"), voiceId: z.string().optional(), volume: z.number().default(1) })
    .default({ provider: "none", volume: 1 }),
  captions: z
    .object({
      mode: z.enum(["burn", "file", "both", "none"]).default("both"),
      style: z.enum(["pop", "line", "box"]).default("pop"),
      /** "hide": não queima a legenda da locução nas cenas em que a fala já está escrita na tela (o .srt continua completo) */
      whenOnScreen: z.enum(["hide", "show"]).default("hide"),
    })
    .default({ mode: "both", style: "pop", whenOnScreen: "hide" }),
  overlays: z
    .object({ logo: z.enum(["none", "top-left", "top-right", "bottom-left", "bottom-right"]).default("none"), grain: z.boolean().default(true), vignette: z.boolean().default(true), progress: z.boolean().default(false) })
    .default({ logo: "none", grain: true, vignette: true, progress: false }),
  /** Área segura extra (px no formato final), ex.: status do WhatsApp/Reels. */
  safe: z.object({ top: z.number().default(0), bottom: z.number().default(0) }).default({ top: 0, bottom: 0 }),
  defaults: z.object({ transition: z.enum(TRANSITIONS).optional(), camera: z.enum(CAMERA_MOVES).optional(), background: backgroundSchema.optional() }).default({}),
  scenes: z.array(sceneSchema).min(1),
});
export type Job = z.infer<typeof jobSchema>;
export type JobInput = z.input<typeof jobSchema>;

// ── Props resolvidas (job + marca + idioma + locução + legendas) ──
export const captionSchema = z.object({ text: z.string(), startMs: z.number(), endMs: z.number(), timestampMs: z.number().nullable(), confidence: z.number().nullable() });
export type CaptionItem = z.infer<typeof captionSchema>;

export const voiceClipSchema = z.object({ src: z.string(), seconds: z.number(), words: z.array(captionSchema) });
export type VoiceClip = z.infer<typeof voiceClipSchema>;

export const propsSchema = z.object({
  job: jobSchema,
  brand: brandSchema,
  langCode: z.string(),
  format: z.enum(Object.keys(FORMATS) as [FormatKey, ...FormatKey[]]),
  /** sceneId -> locução gerada */
  voice: z.record(z.string(), voiceClipSchema).default({}),
  /** sceneId -> legendas de vídeo falado (tempo relativo ao clipe) */
  clipCaptions: z.record(z.string(), z.array(captionSchema)).default({}),
  /** trilha resolvida (gerada ou arquivo) */
  musicSrc: z.string().nullable().default(null),
});
export type VideoProps = z.infer<typeof propsSchema>;
