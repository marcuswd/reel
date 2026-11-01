// Marca do cliente: <pasta>/brand.json, com fontes e logo na mesma pasta (caminhos relativos a ela).
// Fica na pasta do cliente, fora deste repositório. Um job usa com "brand": "<nome>" (procura brand.json
// na pasta do job ou na de cima) ou "brand": "caminho/brand.json".
//   pnpm brand new <pasta> --name "Nome" [--from https://site.com.br]   rascunho (cores, fontes e logo tirados do site)
//   pnpm brand font <pasta> heading|body "Montserrat" [700,800,900]     baixa a fonte do @fontsource (npm) para <pasta>/fonts
//   pnpm brand show <pasta>                                             valida e mostra a marca
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { brandSchema } from "../src/core/schema.ts";
import { die, log, p, parseArgs, readJson, run, userPath, writeJson } from "./lib/env.ts";

const { pos, opt } = parseArgs(process.argv.slice(2));
const s = (k: string) => (typeof opt[k] === "string" ? (opt[k] as string) : undefined);
const UA = { "User-Agent": "Mozilla/5.0 (remotion-base brand extractor)" };
/** <pasta> ou <pasta>/brand.json → caminho do brand.json */
const brandPath = (arg: string | undefined) => {
  const a = userPath(arg ?? die("informe a pasta da marca (ex.: C:\\sites\\cliente\\videos)"));
  return a.endsWith(".json") ? a : join(a, "brand.json");
};

// ── cores ──
const toRgb = (hex: string) => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const hsl = (hex: string) => {
  const [r, g, b] = toRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const sat = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  return { s: sat, l };
};
const norm = (hex: string) => {
  let h = hex.toLowerCase().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return `#${h.slice(0, 6)}`;
};
const rgbToHex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const shade = (hex: string, k: number) => rgbToHex(...(toRgb(hex).map((v) => v * k) as [number, number, number]));

const fetchText = async (url: string) => {
  const r = await fetch(url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
};

const extract = async (url: string) => {
  const html = await fetchText(url);
  const base = new URL(url);
  const abs = (u: string) => new URL(u, base).href;
  const cssLinks = [...html.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi)].map((m) => m[0].match(/href=["']([^"']+)["']/i)?.[1]).filter(Boolean) as string[];
  let css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n") + [...html.matchAll(/style=["']([^"']+)["']/gi)].map((m) => m[1]).join(";");
  for (const l of cssLinks.slice(0, 12)) {
    try { css += "\n" + (await fetchText(abs(l))); } catch { /* ignora */ }
  }
  // cores mais frequentes (ignora cinzas)
  const count = new Map<string, number>();
  for (const m of (css + html).matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    const c = norm(m[0]);
    count.set(c, (count.get(c) ?? 0) + 1);
  }
  for (const m of css.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/gi)) {
    const c = rgbToHex(+m[1], +m[2], +m[3]);
    count.set(c, (count.get(c) ?? 0) + 1);
  }
  const colors = [...count.entries()].filter(([c]) => hsl(c).s > 0.25 && hsl(c).l > 0.08 && hsl(c).l < 0.92).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  // fontes
  const fams = new Map<string, number>();
  for (const m of css.matchAll(/font-family\s*:\s*([^;}{]+)/gi)) {
    const f = m[1].split(",")[0].replace(/!important/gi, "").trim().replace(/["']/g, "");
    if (!/^(inherit|initial|var\(|sans-serif|serif|monospace|system-ui|-apple-system|icons?|fontawesome|font awesome|dashicons|eicons|consolas|courier|menlo|monaco|arial|helvetica|times|georgia|verdana|tahoma|segoe)/i.test(f)) fams.set(f, (fams.get(f) ?? 0) + 1);
  }
  for (const m of html.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/gi)) for (const f of decodeURIComponent(m[1]).split("|")) fams.set(f.split(":")[0].replace(/\+/g, " "), 999);
  const fonts = [...fams.entries()].sort((a, b) => b[1] - a[1]).map(([f]) => f);
  // logo
  const imgs = [...html.matchAll(/<img[^>]+>/gi)].map((m) => m[0]);
  const logoTag = imgs.find((t) => /logo/i.test(t));
  const logo = logoTag?.match(/(?:data-src|src)=["']([^"']+)["']/i)?.[1] ?? html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  return { colors, fonts, logo: logo ? abs(logo) : undefined, title };
};

const cmdNew = async () => {
  const f = brandPath(pos[1]);
  const dir = dirname(f);
  const slug = (s("slug") ?? basename(dir)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (existsSync(f) && !opt.force) die(`${f} já existe (--force para sobrescrever)`);
  const from = s("from");
  let colors: string[] = [];
  let fonts: string[] = [];
  let logoFile: string | undefined;
  let name = s("name") ?? slug;
  if (from) {
    log(`lendo ${from}…`);
    const x = await extract(from);
    colors = x.colors;
    fonts = x.fonts;
    if (!s("name") && x.title) name = x.title.split(/[|\-–]/)[0].trim();
    log(`cores: ${colors.slice(0, 8).join(" ")}`);
    log(`fontes: ${fonts.slice(0, 5).join(", ") || "(nenhuma)"}`);
    if (x.logo) {
      try {
        const r = await fetch(x.logo, { headers: UA });
        const ext = (extname(new URL(x.logo).pathname) || ".png").slice(0, 5);
        mkdirSync(dir, { recursive: true });
        logoFile = `logo${ext}`;
        writeFileSync(join(dir, logoFile), Buffer.from(await r.arrayBuffer()));
        log(`logo: ${x.logo} → ${join(dir, logoFile)}`);
      } catch (e) {
        log(`logo falhou: ${e}`);
      }
    }
  }
  const primary = colors[0] ?? "#3b5bff";
  const accent = colors[1] ?? "#ffb020";
  const dark = colors.find((c) => hsl(c).l < 0.3) ?? shade(primary, 0.25);
  const brand = {
    $schema: relative(dir, p("schemas", "brand.schema.json")).replace(/\\/g, "/"),
    slug,
    name,
    colors: {
      bg: shade(dark, 0.7),
      bg2: dark,
      surface: "#ffffff",
      text: "#ffffff",
      textOnSurface: shade(dark, 0.6),
      muted: "#d6dae8",
      primary,
      accent,
      highlight: accent,
      palette: [primary, accent, ...colors.slice(2, 5)].slice(0, 5).concat(colors.length < 3 ? [dark] : []),
    },
    fonts: { heading: { family: fonts[0] ?? "Inter", files: {} }, body: { family: fonts[1] ?? fonts[0] ?? "Inter", files: {} } },
    logo: { light: logoFile, plate: "none" },
    shape: { radius: 24, style: "round" },
    motion: { energy: "normal", transitions: [] },
    audio: { mood: "corporate", bpm: 110 },
    contact: from ? { site: new URL(from).hostname.replace(/^www\./, "") } : {},
  };
  writeJson(f, brand);
  log(`${f} criado. Próximo: pnpm brand font "${dir}" heading "${brand.fonts.heading.family}" e pnpm brand font "${dir}" body "${brand.fonts.body.family}"`);
};

const cmdFont = async () => {
  const f = brandPath(pos[1]);
  const role = pos[2] as "heading" | "body";
  if (role !== "heading" && role !== "body") die("papel: heading ou body");
  const family = pos[3] ?? die('família, ex.: "Montserrat"');
  const weights = (pos[4] ?? (role === "heading" ? "700,800,900" : "400,500,700")).split(",");
  const brand = readJson<Record<string, any>>(f);
  const pkg = `@fontsource/${family.toLowerCase().replace(/\s+/g, "-")}`;
  const tmp = mkdtempSync(join(tmpdir(), "font-"));
  log(`baixando ${pkg} do npm…`);
  run(process.platform === "win32" ? "npm.cmd" : "npm", ["pack", pkg, "--pack-destination", tmp, "--silent"], { quiet: true });
  const tgz = readdirSync(tmp).find((x) => x.endsWith(".tgz")) ?? die("pacote não encontrado");
  run("tar", ["-xzf", join(tmp, tgz), "-C", tmp], { quiet: true });
  const files = join(tmp, "package", "files");
  const id = pkg.split("/")[1];
  const dir = join(dirname(f), "fonts");
  mkdirSync(dir, { recursive: true });
  const map: Record<string, string> = {};
  for (const w of weights) {
    const name = `${id}-latin-${w}-normal.woff2`;
    if (!existsSync(join(files, name))) { log(`peso ${w} não existe em ${pkg}`); continue; }
    copyFileSync(join(files, name), join(dir, name));
    map[w] = `fonts/${name}`;
  }
  if (!Object.keys(map).length) die("nenhum peso copiado");
  brand.fonts[role] = { family, files: map };
  writeJson(f, brand);
  log(`${role}: ${family} ${Object.keys(map).join(", ")} → ${dir}`);
};

const cmdShow = () => {
  const r = brandSchema.safeParse(readJson(brandPath(pos[1])));
  if (!r.success) die(r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"));
  console.log(JSON.stringify(r.data, null, 2));
};

const main = async () => {
  if (pos[0] === "new") return cmdNew();
  if (pos[0] === "font") return cmdFont();
  if (pos[0] === "show") return cmdShow();
  console.log('uso: pnpm brand new <pasta> [--from URL] | pnpm brand font <pasta> heading|body "Família" [pesos] | pnpm brand show <pasta>');
};
main().catch((e) => { console.error(e); process.exit(1); });
