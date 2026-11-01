// Pasta do job: tudo de um vídeo mora nela, fora do repositório do motor.
//
//   <pasta>/job.json            roteiro (caminhos de mídia relativos à pasta: "img/foto.jpg")
//   <pasta>/i18n/<lang>.json    traduções
//   <pasta>/img, video, stock…  material
//   <pasta>/voice, audio/       locução e trilha geradas
//   <pasta>/_build/             props resolvidas (gerado)
//   <pasta>/out/                stills, folhas de contato, render temporário
//   <pasta>/entregas/<data>/    mp4, thumb, srt, vtt, créditos (ou --dest)
//
// Marca: "brand" no job é um caminho para .json (relativo à pasta) ou um nome; com nome, procura
// <pasta>/brand.json, <pasta>/../brand.json e <pasta>/../brands/<nome>.json. Caminhos da marca
// (fontes, logo) são relativos à pasta do brand.json.
//
// A composição só enxerga a "public" do bundle; nela o material aparece como public/<slug>/ e a
// marca como public/_brand/. relocate() traduz os caminhos do job e da marca para esse formato.
import { cpSync, existsSync, mkdirSync, mkdtempSync, statSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { die, p, readJson } from "./env.ts";

export type Workspace = { dir: string; slug: string; brandFile: string; brandDir: string; brandPrefix: string };

/** Pastas geradas: não vão para o bundle. */
export const GENERATED = ["_build", "out", "entregas"];
const SKIP = new Set([...GENERATED, ".git", "node_modules"]);

export const brandCandidates = (dir: string, brand: string) =>
  (brand.endsWith(".json") ? [resolve(dir, brand)] : [join(dir, "brand.json"), join(dir, "..", "brand.json"), join(dir, "..", "brands", `${brand}.json`)]).map((f) => resolve(f));

export const openWorkspace = (dirArg: string): Workspace => {
  const dir = resolve(dirArg);
  const f = join(dir, "job.json");
  if (!existsSync(f)) die(`${f} não existe. Crie com: pnpm video new "${dir}" --brand <marca>`);
  const raw = readJson<{ slug?: unknown; brand?: unknown }>(f);
  const slug = typeof raw.slug === "string" ? raw.slug : die(`${f}: falta "slug"`);
  const brand = typeof raw.brand === "string" ? raw.brand : die(`${f}: falta "brand"`);
  const tried = brandCandidates(dir, brand);
  const brandFile = tried.find((c) => existsSync(c)) ?? die(`marca "${brand}" não encontrada. Procurei:\n${tried.map((c) => `  ${c}`).join("\n")}`);
  const brandDir = dirname(brandFile);
  return { dir, slug, brandFile, brandDir, brandPrefix: brandDir === dir ? `${slug}/` : "_brand/" };
};

// Um processo trabalha sobre uma pasta só (a do comando).
let current: Workspace | null = null;
export const useWorkspace = (dirArg: string) => (current = openWorkspace(dirArg));
export const ws = (): Workspace => current ?? die("nenhuma pasta de job aberta");

/** Caminho como a composição vê ("<slug>/voice/x.mp3", "_brand/logo.svg", "_lib/sfx") → arquivo no disco. */
export const fileOf = (rel: string, w: Workspace = ws()) => {
  if (rel.startsWith(`${w.slug}/`)) return join(w.dir, rel.slice(w.slug.length + 1));
  if (rel.startsWith("_brand/")) return join(w.brandDir, rel.slice("_brand/".length));
  return p("public", rel);
};

const looksLikePath = (s: string) => !/^(https?:|data:|blob:)/.test(s) && (/\.[a-z0-9]{2,5}$/i.test(s) || s.includes("/"));

/** Troca cada string que é um arquivo (ou pasta) existente em `base` por `prefix + caminho`. */
export const relocate = <T>(x: T, base: string, prefix: string): T => {
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      const clean = v.replace(/^\.\//, "").replace(/\\/g, "/");
      return looksLikePath(clean) && !clean.startsWith(prefix) && existsSync(join(base, clean)) ? prefix + clean : v;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "$schema" ? x : walk(x)]));
    return v;
  };
  return walk(x) as T;
};

/**
 * Põe o material dentro de uma pasta "public": public/<slug> = pasta do job, public/_brand = pasta da marca.
 * copy: para o bundle de render (sem links: no Windows, link de pasta pede admin).
 * link: para o Studio (junction no Windows não pede admin e mostra mudanças na hora).
 */
export const stage = (publicRoot: string, mode: "copy" | "link", w: Workspace = ws()) => {
  mkdirSync(publicRoot, { recursive: true });
  const job = join(publicRoot, w.slug);
  if (!existsSync(job)) {
    if (mode === "link") symlinkSync(w.dir, job, "junction");
    else cpSync(w.dir, job, { recursive: true, filter: (f) => !SKIP.has(f.slice(w.dir.length + 1).split(/[\\/]/)[0]) });
  }
  if (w.brandPrefix !== "_brand/") return;
  const brand = join(publicRoot, "_brand");
  if (existsSync(brand)) return;
  if (mode === "link") return void symlinkSync(w.brandDir, brand, "junction");
  // a pasta da marca costuma conter os outros jobs do cliente: copia só o que o brand.json usa
  for (const rel of brandFiles(w)) {
    mkdirSync(dirname(join(brand, rel)), { recursive: true });
    cpSync(join(w.brandDir, rel), join(brand, rel));
  }
};

/** Arquivos da pasta da marca citados no brand.json (fontes, logos). */
export const brandFiles = (w: Workspace = ws()) => {
  const out = new Set<string>(["brand.json"].filter(() => basename(w.brandFile) === "brand.json"));
  const walk = (v: unknown): void => {
    if (typeof v === "string") {
      const clean = v.replace(/^\.\//, "").replace(/\\/g, "/");
      if (looksLikePath(clean) && existsSync(join(w.brandDir, clean)) && statSync(join(w.brandDir, clean)).isFile()) out.add(clean);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => k !== "$schema" && walk(x));
  };
  walk(readJson(w.brandFile));
  return [...out];
};

/** "public" temporária para o Studio: motor (_lib, fonts) + job + marca, tudo por junction. */
export const studioPublic = (w: Workspace = ws()) => {
  const root = mkdtempSync(join(tmpdir(), "reel-public-"));
  for (const name of ["_lib", "fonts"]) if (existsSync(p("public", name))) symlinkSync(p("public", name), join(root, name), "junction");
  stage(root, "link", w);
  return root;
};
