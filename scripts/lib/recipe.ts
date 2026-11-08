// Receitas: conjuntos de padrões (JSON em recipes/<família>/<nome>.json) aplicados ao job e à marca criados por
// `pnpm video new --recipe dark/noir-frio+curiosidades`. Tudo aqui é puro (sem disco); o CLI lê e grava.
// O usuário pode sobrescrever qualquer campo depois: a receita só preenche o que o `new` cria.

import { isAbsolute, relative, resolve } from "node:path";

export type Obj = Record<string, unknown>;

export type RecipeLicense = { kind: string; name: string; license: string; url: string; source?: string; notes?: string };

export type Recipe = {
  name: string;
  kind: "style" | "narration";
  description?: string;
  /** padrões do job.json (mesmos campos do schema do job, parciais) */
  job?: Obj;
  /** padrões da marca; fonts.*.weights lista os pesos a baixar do @fontsource */
  brand?: Obj;
  notes?: string[];
  licenses?: RecipeLicense[];
};

const isObj = (x: unknown): x is Obj => typeof x === "object" && x !== null && !Array.isArray(x);

/** Mescla `over` sobre `base`: objetos em profundidade, o resto (inclusive listas) é substituído. Não muta. */
export const deepMerge = (base: Obj, over: Obj | undefined): Obj => {
  const out: Obj = { ...base };
  for (const [k, v] of Object.entries(over ?? {})) {
    if (v === undefined || k === "__proto__" || k === "constructor" || k === "prototype") continue;
    out[k] = isObj(v) ? deepMerge(isObj(out[k]) ? (out[k] as Obj) : {}, v) : v;
  }
  return out;
};

const NAME = /^[a-z0-9-]+(\/[a-z0-9-]+)?$/;

/** "dark/noir-frio+curiosidades" -> ["dark/noir-frio", "dark/curiosidades"] (nomes sem pasta herdam a do primeiro). */
export const parseRecipeSpec = (spec: string): string[] => {
  const parts = spec.split("+").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) throw new Error("receita vazia");
  const family = parts[0].includes("/") ? parts[0].split("/")[0] : "";
  const names = parts.map((n) => (n.includes("/") || !family ? n : `${family}/${n}`));
  for (const n of names) if (!NAME.test(n)) throw new Error(`nome de receita inválido: "${n}" (use pasta/nome, só a-z, 0-9 e hífen)`);
  return names;
};

export type Merged = { names: string[]; job: Obj; brand: Obj; notes: string[]; licenses: RecipeLicense[] };

/** Junta as receitas na ordem (a última vence em conflito); licenças se somam sem repetir. */
export const mergeRecipes = (recipes: Recipe[]): Merged => {
  let job: Obj = {};
  let brand: Obj = {};
  const notes: string[] = [];
  const licenses: RecipeLicense[] = [];
  for (const r of recipes) {
    job = deepMerge(job, r.job);
    brand = deepMerge(brand, r.brand);
    notes.push(...(r.notes ?? []));
    for (const l of r.licenses ?? []) if (!licenses.some((x) => x.kind === l.kind && x.name === l.name)) licenses.push(l);
  }
  return { names: recipes.map((r) => r.name), job, brand, notes, licenses };
};

/** Job final: o job base do `new` com os padrões da receita por cima; `explicit` (flags do usuário) vence a receita. */
export const applyToJob = (base: Obj, recipe: { job: Obj }, explicit: Obj = {}): Obj => deepMerge(deepMerge(base, recipe.job), explicit);

/** Campos da marca do cliente que sobrevivem à receita: identidade para cta/logo finais. */
export const CLIENT_KEEP = ["slug", "name", "logo", "contact"] as const;

/**
 * Marca do job: padrões da receita (cores, fontes, movimento, grade) + identidade do cliente (nome, logo e contato;
 * as cores do cliente nunca entram). Sem marca de cliente, usa só a receita com `slug`/`name` dados.
 */
export const buildBrand = (recipeBrand: Obj, client: Obj | undefined, fallback: { slug: string; name: string }): Obj => {
  let brand = deepMerge({ slug: fallback.slug, name: fallback.name }, recipeBrand);
  if (client) {
    const keep: Obj = {};
    for (const k of CLIENT_KEEP) if (client[k] !== undefined) keep[k] = client[k];
    brand = deepMerge(brand, keep);
  }
  return brand;
};

/** Caminho `rel` resolvido dentro de `dir`; `undefined` se for absoluto ou sair da pasta (`..`). */
export const insideDir = (dir: string, rel: string): string | undefined => {
  if (isAbsolute(rel)) return undefined;
  const alvo = resolve(dir, rel);
  const r = relative(resolve(dir), alvo);
  return r && !r.startsWith("..") && !isAbsolute(r) ? alvo : undefined;
};

/** Pesos a baixar por papel de fonte (heading/body). */
export const fontPlan = (brand: Obj): { role: "heading" | "body"; family: string; weights: string[] }[] => {
  const fonts = isObj(brand.fonts) ? brand.fonts : {};
  const plan: { role: "heading" | "body"; family: string; weights: string[] }[] = [];
  for (const role of ["heading", "body"] as const) {
    const f = fonts[role];
    if (isObj(f) && typeof f.family === "string") plan.push({ role, family: f.family, weights: Array.isArray(f.weights) ? f.weights.map(String) : [] });
  }
  return plan;
};

/** Marca sem o campo `weights` (não existe no schema) e com `files` vazio até o download dos arquivos. */
export const stripWeights = (brand: Obj): Obj => {
  const fonts = isObj(brand.fonts) ? brand.fonts : undefined;
  if (!fonts) return brand;
  const clean: Obj = {};
  for (const [role, f] of Object.entries(fonts)) {
    if (isObj(f)) {
      const { weights: _w, ...rest } = f;
      clean[role] = { files: {}, ...rest };
    } else clean[role] = f;
  }
  return { ...brand, fonts: clean };
};
