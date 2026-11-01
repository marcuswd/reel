// Validação de um job e da marca sem renderizar (pnpm video check <pasta>). Puro: o acesso ao disco é injetado.
import { brandSchema, jobSchema, type Brand, type Job, type MediaInput } from "../../src/core/schema.ts";

export type Report = { errors: string[]; warnings: string[] };
export type Disk = {
  /** existe um arquivo (ou pasta) neste caminho relativo à pasta do job? */
  job: (rel: string) => boolean;
  /** idem, relativo à pasta da marca */
  brand: (rel: string) => boolean;
  /** idem, na public do motor (_lib/…) */
  engine: (rel: string) => boolean;
  /** traduções do idioma, ou null se o arquivo não existe */
  i18n: (lang: string) => Record<string, string> | null;
  /** cenas com locução gerada para o idioma */
  voiced: (lang: string) => string[];
};

const isUrl = (s: string) => /^(https?:|data:|blob:)/.test(s);
const issues = (e: { issues: { path: PropertyKey[]; message: string }[] }, prefix: string) =>
  e.issues.map((i) => `${prefix}${i.path.join(".") || "(raiz)"}: ${i.message}`);

/** Caminhos de mídia citados pelo job, com o campo de onde vieram. */
export const jobMedia = (job: Job): { field: string; path: string }[] => {
  const out: { field: string; path: string }[] = [];
  const media = (field: string, m: MediaInput | undefined) => {
    if (!m) return;
    if (typeof m === "string") out.push({ field, path: m });
    else {
      out.push({ field: `${field}.src`, path: m.src });
      if (m.captions) out.push({ field: `${field}.captions`, path: m.captions });
    }
  };
  const background = (field: string, b: unknown) => {
    if (b && typeof b === "object" && "media" in b) media(`${field}.media`, (b as { media?: MediaInput }).media);
  };
  background("defaults.background", job.defaults.background);
  if (job.music.mode === "file" && job.music.file) out.push({ field: "music.file", path: job.music.file });
  job.scenes.forEach((s, i) => {
    const f = `scenes.${i} (${s.id})`;
    background(`${f}.background`, s.background);
    if ("media" in s) media(`${f}.media`, s.media);
    if (s.type === "screen") out.push({ field: `${f}.src`, path: s.src });
    if (s.type === "gallery") s.items.forEach((m, k) => media(`${f}.items.${k}`, m));
    if (s.type === "quote" && s.avatar) out.push({ field: `${f}.avatar`, path: s.avatar });
  });
  return out;
};

/** Caminhos de arquivo citados pela marca (fontes e logos). */
export const brandMedia = (b: Brand) => [
  ...(["heading", "body"] as const).flatMap((r) => Object.entries(b.fonts[r].files).map(([w, path]) => ({ field: `fonts.${r}.files.${w}`, path }))),
  ...(["light", "dark", "mark"] as const).flatMap((k) => (b.logo[k] ? [{ field: `logo.${k}`, path: b.logo[k]! }] : [])),
];

export const checkJob = (rawJob: unknown, rawBrand: unknown, disk: Disk, slug: string): Report => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const j = jobSchema.safeParse(rawJob);
  if (!j.success) errors.push(...issues(j.error, "job.json: "));
  const b = brandSchema.safeParse(rawBrand);
  if (!b.success) errors.push(...issues(b.error, "brand.json: "));

  if (j.success) {
    const job = j.data;
    // ids repetidos quebram locução, traduções e legendas
    const seen = new Set<string>();
    for (const s of job.scenes) {
      if (seen.has(s.id)) errors.push(`job.json: scenes: id "${s.id}" repetido`);
      seen.add(s.id);
    }
    const langs = job.langs?.length ? job.langs : [job.lang];
    const inJob = (p: string) => disk.job(p) || (p.startsWith(`${slug}/`) && disk.job(p.slice(slug.length + 1))) || disk.engine(p);
    for (const { field, path } of jobMedia(job)) {
      if (isUrl(path)) continue;
      const variants = path.includes("{lang}") ? langs.map((l) => path.replace("{lang}", l.toLowerCase())) : [path];
      for (const v of variants) if (!inJob(v)) errors.push(`job.json: ${field}: arquivo não encontrado: ${v}`);
    }
    // efeitos: pack e nomes avulsos por cena
    if (job.sfx.enabled) {
      if (!inJob(job.sfx.pack)) errors.push(`job.json: sfx.pack: pasta não encontrada: ${job.sfx.pack}`);
      else job.scenes.forEach((s, i) => s.sfx && !inJob(`${job.sfx.pack}/${s.sfx}.mp3`) && errors.push(`job.json: scenes.${i} (${s.id}).sfx: efeito não encontrado: ${job.sfx.pack}/${s.sfx}.mp3`));
    }
    // idiomas e locução: avisos (o build usa o original e segue sem a fala)
    for (const lang of langs) {
      if (lang !== job.lang) {
        const dict = disk.i18n(lang);
        if (!dict) warnings.push(`${lang}: i18n/${lang}.json não existe (pnpm video translate <pasta> --to ${lang})`);
        else {
          const empty = Object.entries(dict).filter(([, v]) => !v).length;
          if (empty) warnings.push(`${lang}: ${empty} texto(s) sem tradução em i18n/${lang}.json`);
        }
      }
      if (job.voice.provider !== "none") {
        const voiced = new Set(disk.voiced(lang));
        const missing = job.scenes.filter((s) => s.voice && !voiced.has(s.id)).map((s) => s.id);
        if (missing.length) warnings.push(`${lang}: locução faltando em ${missing.join(", ")} (pnpm video voice <pasta> --lang ${lang})`);
      }
    }
  }

  if (b.success) for (const { field, path } of brandMedia(b.data)) if (!isUrl(path) && !disk.brand(path) && !disk.engine(path)) errors.push(`brand.json: ${field}: arquivo não encontrado: ${path}`);

  return { errors, warnings };
};
