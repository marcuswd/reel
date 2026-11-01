// Monta as props finais de um job: roteiro + marca + idioma + locução + legendas + trilha.
// Tudo é lido da pasta do job aberta (workspace.ts).
import { existsSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { brandSchema, jobSchema, type Brand, type CaptionItem, type FormatKey, type Job, type Scene, type VideoProps, type VoiceClip } from "../../src/core/schema.ts";
import { planTimeline } from "../../src/core/timeline.ts";
import { die, fmtId, hash, langId, p, readJson, writeJson } from "./env.ts";
import { fileOf, relocate, ws, type Workspace } from "./workspace.ts";

const issues = (e: { issues: { path: PropertyKey[]; message: string }[] }) => e.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");

/** job.json da pasta aberta, validado. */
export const loadJob = (w: Workspace = ws()): Job => {
  const f = join(w.dir, "job.json");
  const r = jobSchema.safeParse(readJson(f));
  if (!r.success) die(`job inválido (${f}):\n${issues(r.error)}`);
  return r.data!;
};

/** Marca do job, validada. */
export const loadBrand = (w: Workspace = ws()): Brand => {
  const r = brandSchema.safeParse(readJson(w.brandFile));
  if (!r.success) die(`marca inválida (${w.brandFile}):\n${issues(r.error)}`);
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
    if (s.type === "chart") s.items.forEach((it, i) => (out[`${s.id}.items.${i}.label`] = it.label));
    if (s.type === "map") s.points.forEach((pt, i) => pt.label && (out[`${s.id}.points.${i}.label`] = pt.label));
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

export const i18nFile = (lang: string, w: Workspace = ws()) => join(w.dir, "i18n", `${lang}.json`);

/** Aplica <pasta>/i18n/<lang>.json (chaves vazias caem no texto original). */
export const applyI18n = (job: Job, lang: string): { job: Job; missing: string[] } => {
  if (lang === job.lang) return { job, missing: [] };
  const f = i18nFile(lang);
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
export const voiceDir = (slug: string, lang: string) => fileOf(`${slug}/voice/${langId(lang)}`);
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
    // relativo à pasta do job ("clips/fala.{lang}.captions.json") ou já no formato público
    const f = existsSync(join(ws().dir, rel)) ? join(ws().dir, rel) : fileOf(rel);
    if (existsSync(f)) out[s.id] = readJson<CaptionItem[]>(f);
  }
  return out;
};

export const musicFile = (slug: string, lang: string) => `${slug}/audio/generated/music-${langId(lang)}.mp3`;

/** Props completas (formato fica como o primeiro; o Root troca por composição). */
export const resolveProps = (slug: string, lang: string, format?: FormatKey): { props: VideoProps; missing: string[] } => {
  const w = ws();
  // caminhos relativos à pasta do job e à pasta da marca viram caminhos da "public" do bundle
  const base = relocate(loadJob(w), w.dir, `${w.slug}/`);
  const brand = relocate(loadBrand(w), w.brandDir, w.brandPrefix);
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
  if (job.music.mode === "generate" && existsSync(fileOf(musicFile(slug, lang)))) props.musicSrc = musicFile(slug, lang);
  return { props, missing };
};

export const planOf = (props: VideoProps) => planTimeline(props);

export const buildFile = (lang: string, w: Workspace = ws()) => join(w.dir, "_build", `${langId(lang)}.json`);
/** Grava <pasta>/_build/<lang>.json. */
export const writeResolved = (_slug: string, lang: string, props: VideoProps) => writeJson(buildFile(lang), props);

/** src/jobs.generated.ts: vazio, ou com o job aberto no Studio (pnpm video studio <pasta>). Não versionado. */
export const writeIndex = (w?: Workspace) => {
  const entries: string[] = [];
  const imports: string[] = [];
  let n = 0;
  if (w) {
    const job = loadJob(w);
    for (const lang of langsOf(job)) {
      const f = buildFile(lang, w);
      if (!existsSync(f)) continue;
      const v = `j${n++}`;
      const rel = relative(p("src"), f).replace(/\\/g, "/");
      imports.push(`import ${v} from ${JSON.stringify(rel.startsWith(".") ? rel : `./${rel}`)};`);
      entries.push(`  { slug: ${JSON.stringify(w.slug)}, lang: ${JSON.stringify(lang)}, formats: ${JSON.stringify(job.formats)}, props: ${v} as unknown as VideoProps },`);
    }
  }
  const src = `// GERADO por \`pnpm video index\` / \`pnpm video studio <pasta>\`. Não edite nem versione.
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
