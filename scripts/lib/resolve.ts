// Monta as props finais de um job: roteiro + marca + idioma + locução + legendas + trilha.
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { brandSchema, jobSchema, type Brand, type CaptionItem, type FormatKey, type Job, type Scene, type VideoProps, type VoiceClip } from "../../src/core/schema.ts";
import { planTimeline } from "../../src/core/timeline.ts";
import { die, fmtId, hash, langId, p, readJson, writeJson } from "./env.ts";

export const listJobs = () => (existsSync(p("jobs")) ? readdirSync(p("jobs")).filter((d) => existsSync(p("jobs", d, "job.json"))) : []);

export const loadJob = (slug: string): Job => {
  const f = p("jobs", slug, "job.json");
  if (!existsSync(f)) die(`jobs/${slug}/job.json não existe (pnpm video new ${slug})`);
  const r = jobSchema.safeParse(readJson(f));
  if (!r.success) die(`job inválido (${slug}):\n${r.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
  return r.data!;
};

export const loadBrand = (slug: string): Brand => {
  const f = p("brands", `${slug}.json`);
  if (!existsSync(f)) die(`brands/${slug}.json não existe`);
  const r = brandSchema.safeParse(readJson(f));
  if (!r.success) die(`marca inválida (${slug}):\n${r.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
  return r.data!;
};

export const langsOf = (job: Job) => job.langs?.length ? job.langs : [job.lang];

// ── i18n ──
/** Campos de texto traduzíveis; ids, caminhos de mídia e opções ficam iguais. */
const TEXT_KEYS = ["eyebrow", "title", "subtitle", "text", "voice", "button", "tagline", "role"] as const;

/** Lista "id.caminho" -> texto de todas as strings traduzíveis do roteiro. */
export const extractStrings = (job: Job) => {
  const out: Record<string, string> = {};
  if (job.title) out["_title"] = job.title;
  for (const s of job.scenes) {
    const r = s as unknown as Record<string, unknown>;
    for (const k of TEXT_KEYS) if (typeof r[k] === "string" && (r[k] as string).trim()) out[`${s.id}.${k}`] = r[k] as string;
    if (s.type === "list") s.items.forEach((t, i) => (out[`${s.id}.items.${i}`] = t));
    if (s.type === "split") (s.bullets ?? []).forEach((t, i) => (out[`${s.id}.bullets.${i}`] = t));
    if (s.type === "stats")
      s.items.forEach((it, i) => {
        out[`${s.id}.items.${i}.label`] = it.label;
        if (it.prefix) out[`${s.id}.items.${i}.prefix`] = it.prefix;
        if (it.suffix) out[`${s.id}.items.${i}.suffix`] = it.suffix;
      });
  }
  return out;
};

const setPath = (obj: Record<string, unknown>, path: string[], value: string) => {
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (cur[k] === undefined || typeof cur[k] !== "object") return false;
    cur = cur[k] as Record<string, unknown>;
  }
  const last = path[path.length - 1];
  if (typeof cur[last] !== "string") return false;
  cur[last] = value;
  return true;
};

/** Aplica jobs/<slug>/i18n/<lang>.json (chaves vazias caem no texto original). */
export const applyI18n = (job: Job, lang: string): { job: Job; missing: string[] } => {
  if (lang === job.lang) return { job, missing: [] };
  const f = p("jobs", job.slug, "i18n", `${lang}.json`);
  const dict: Record<string, string> = existsSync(f) ? readJson(f) : {};
  const clone: Job = JSON.parse(JSON.stringify(job));
  const missing: string[] = [];
  const byId = new Map(clone.scenes.map((s) => [s.id, s as unknown as Record<string, unknown>]));
  for (const key of Object.keys(extractStrings(job))) {
    const t = dict[key];
    if (!t) { missing.push(key); continue; }
    if (key === "_title") { clone.title = t; continue; }
    const [id, ...path] = key.split(".");
    const sc = byId.get(id);
    if (sc) setPath(sc, path, t);
  }
  clone.lang = lang;
  return { job: clone, missing };
};

// ── Locução ──
export const voiceDir = (slug: string, lang: string) => p("public", slug, "voice", langId(lang));
export const voiceKey = (job: Job, s: Scene) => hash([s.voice, job.voice.provider, job.voice.voiceId ?? ""]);
/** Manifest: { [sceneId]: { key, src, seconds, words } }. Só entra a fala cujo texto não mudou. */
export const loadVoice = (job: Job, lang: string): Record<string, VoiceClip> => {
  const f = `${voiceDir(job.slug, lang)}/manifest.json`;
  if (job.voice.provider === "none" || !existsSync(f)) return {};
  const m = readJson<Record<string, VoiceClip & { key: string }>>(f);
  const out: Record<string, VoiceClip> = {};
  for (const s of job.scenes) {
    const v = m[s.id];
    if (s.voice && v && v.key === voiceKey(job, s)) out[s.id] = { src: v.src, seconds: v.seconds, words: v.words };
  }
  return out;
};

// ── Legendas de vídeos falados ──
const loadClipCaptions = (job: Job, lang: string): Record<string, CaptionItem[]> => {
  const out: Record<string, CaptionItem[]> = {};
  for (const s of job.scenes) {
    if (s.type !== "media" || typeof s.media === "string" || !s.media.captions) continue;
    const rel = s.media.captions.replace("{lang}", langId(lang));
    const f = p("public", rel);
    if (existsSync(f)) out[s.id] = readJson<CaptionItem[]>(f);
  }
  return out;
};

export const musicFile = (slug: string, lang: string) => `${slug}/audio/generated/music-${langId(lang)}.mp3`;

/** Props completas (formato fica como o primeiro; o Root troca por composição). */
export const resolveProps = (slug: string, lang: string, format?: FormatKey): { props: VideoProps; missing: string[] } => {
  const base = loadJob(slug);
  const brand = loadBrand(base.brand);
  const { job, missing } = applyI18n(base, lang);
  const props: VideoProps = {
    job,
    brand,
    langCode: lang,
    format: format ?? job.formats[0],
    voice: loadVoice(job, lang),
    clipCaptions: loadClipCaptions(job, lang),
    musicSrc: null,
  };
  if (job.music.mode === "file" && job.music.file) props.musicSrc = job.music.file;
  if (job.music.mode === "generate" && existsSync(p("public", musicFile(slug, lang)))) props.musicSrc = musicFile(slug, lang);
  return { props, missing };
};

export const planOf = (props: VideoProps) => planTimeline(props);

/** Grava jobs/<slug>/_build/<lang>.json e regenera src/jobs.generated.ts. */
export const writeResolved = (slug: string, lang: string, props: VideoProps) => writeJson(p("jobs", slug, "_build", `${langId(lang)}.json`), props);

export const writeIndex = () => {
  const entries: string[] = [];
  const imports: string[] = [];
  let n = 0;
  for (const slug of listJobs()) {
    let job: Job;
    try { job = loadJob(slug); } catch { continue; }
    for (const lang of langsOf(job)) {
      const f = p("jobs", slug, "_build", `${langId(lang)}.json`);
      if (!existsSync(f)) continue;
      const v = `j${n++}`;
      imports.push(`import ${v} from "../jobs/${slug}/_build/${langId(lang)}.json";`);
      entries.push(`  { slug: ${JSON.stringify(slug)}, lang: ${JSON.stringify(lang)}, formats: ${JSON.stringify(job.formats)}, props: ${v} as unknown as VideoProps },`);
    }
  }
  const src = `// GERADO por \`pnpm video build\`. Não edite: mude jobs/<slug>/job.json e rode o build.
import type { FormatKey, VideoProps } from "./core/schema";
${imports.join("\n")}

export const JOBS: { slug: string; lang: string; formats: FormatKey[]; props: VideoProps }[] = [
${entries.join("\n")}
];
`;
  writeFileSync(p("src", "jobs.generated.ts"), src);
  return n;
};

export const compId = (slug: string, format: string, lang: string) => `${slug}-${fmtId(format)}-${langId(lang)}`;
