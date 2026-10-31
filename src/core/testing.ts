// Fábricas para os testes do motor (não usadas pela composição).
import { brandSchema, jobSchema, propsSchema, type CaptionItem, type FormatKey, type JobInput, type VideoProps } from "./schema";

const c = "#112233";
export const brand = (over: Record<string, unknown> = {}) =>
  brandSchema.parse({
    slug: "teste",
    name: "Teste",
    colors: { bg: c, bg2: c, surface: c, text: "#ffffff", textOnSurface: "#000000", muted: c, primary: c, accent: c, highlight: c, palette: [c, c] },
    fonts: { heading: { family: "Inter" }, body: { family: "Inter" } },
    ...over,
  });

export const job = (over: Partial<JobInput> = {}) =>
  jobSchema.parse({
    slug: "teste",
    brand: "teste",
    scenes: [
      { id: "capa", type: "cover", title: "Título com [destaque]" },
      { id: "ideia", type: "statement", text: "Uma frase curta" },
      { id: "lista", type: "list", title: "Três itens", items: ["um", "dois", "três"] },
      { id: "cta", type: "cta", title: "Fale com a gente" },
    ],
    ...over,
  });

export const props = (o: { job?: Partial<JobInput>; brand?: Record<string, unknown>; voice?: VideoProps["voice"]; clipCaptions?: VideoProps["clipCaptions"]; format?: FormatKey } = {}): VideoProps =>
  propsSchema.parse({ job: job(o.job), brand: brand(o.brand), langCode: "pt-br", format: o.format ?? "16:9", voice: o.voice ?? {}, clipCaptions: o.clipCaptions ?? {} });

/** Palavras com tempo (ms), uma a cada `step` ms a partir de `from`. */
export const words = (text: string, from = 0, step = 300): CaptionItem[] =>
  text.split(" ").map((w, i) => ({ text: w, startMs: from + i * step, endMs: from + i * step + step - 50, timestampMs: null, confidence: null }));
