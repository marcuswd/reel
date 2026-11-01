// Banco de fotos e vídeos para composições genéricas.
//   pnpm media search --type photo|video --q "acai bowl" [--orientation portrait|landscape|square] [--source all|pixabay|unsplash|pexels|openverse] [--limit 8] [--sheet]
//   pnpm media get --source pixabay --id 123 --type photo|video --out <pasta do job>/stock/<nome>.jpg
//   pnpm media gen --prompt "fundo abstrato de ondas" --out <pasta do job>/img/fundo.jpg [--variants 4] [--style "3d render"]
//                  imagem por IA (FLUX schnell no Cloudflare, grátis; CF_ACCOUNT_ID e CF_API_TOKEN). Usa a paleta do
//                  brand.json mais próximo (ou --brand <pasta>). Nunca pessoas: só fundos, objetos e ilustrações.
//
// Chaves no .env: PIXABAY_API_KEY (fotos e vídeos), UNSPLASH_ACCESS_KEY (fotos), PEXELS_API_KEY (fotos e vídeos).
// Openverse não precisa de chave (fotos CC0/CC-BY). Licenças aceitas: Pixabay, Unsplash, Pexels, CC0, CC-BY.
// O `get` registra autor, link e licença em credits.json e CREDITS.md na pasta de destino
// (o render copia os créditos junto com o vídeo). No Unsplash, o `get` dispara o endpoint oficial de download.
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { die, has, log, p, parseArgs, readJson, run, userPath, writeJson } from "./lib/env.ts";
import { sheetArgs } from "./lib/sheet.ts";
import { buildPrompt, genImage, genRequest, variantNames, type GenBrand } from "./lib/gen.ts";

type Item = {
  source: string;
  id: string;
  type: "photo" | "video";
  w: number;
  h: number;
  duration?: number;
  author: string;
  authorUrl?: string;
  page: string;
  preview: string;
  file: string; // melhor arquivo para baixar
  license: string;
  download?: string; // unsplash: endpoint de rastreio
};

const { pos, opt } = parseArgs(process.argv.slice(2));
const s = (k: string) => (typeof opt[k] === "string" ? (opt[k] as string) : undefined);
const UA = { "User-Agent": "remotion-base/1.0 (marcuswd.dev)" };
const getJson = async <T,>(url: string, headers: Record<string, string> = {}) => {
  const r = await fetch(url, { headers: { ...UA, ...headers } });
  if (!r.ok) throw new Error(`${r.status} ${url.replace(/(key|client_id)=[^&]+/, "$1=***")}`);
  return (await r.json()) as T;
};

const orient = s("orientation");
const want = (w: number, h: number) => !orient || (orient === "portrait" ? h > w * 1.05 : orient === "landscape" ? w > h * 1.05 : Math.abs(w / h - 1) < 0.2);

const providers: Record<string, { key?: string; types: ("photo" | "video")[]; search: (q: string, type: "photo" | "video", n: number) => Promise<Item[]>; one?: (id: string, type: "photo" | "video") => Promise<Item> }> = {
  pixabay: {
    key: "PIXABAY_API_KEY",
    types: ["photo", "video"],
    async search(q, type, n) {
      const k = process.env.PIXABAY_API_KEY!;
      const params = new URLSearchParams({ key: k, q, per_page: String(Math.max(3, Math.min(200, n * 2))), safesearch: "true", lang: "pt" });
      if (type === "photo") {
        params.set("image_type", "photo");
        if (orient && orient !== "square") params.set("orientation", orient === "portrait" ? "vertical" : "horizontal");
        const j = await getJson<{ hits: { id: number; imageWidth: number; imageHeight: number; user: string; user_id: number; pageURL: string; previewURL: string; webformatURL: string; largeImageURL: string }[] }>(`https://pixabay.com/api/?${params}`);
        return j.hits.map((h) => ({ source: "pixabay", id: String(h.id), type, w: h.imageWidth, h: h.imageHeight, author: h.user, authorUrl: `https://pixabay.com/users/${h.user}-${h.user_id}/`, page: h.pageURL, preview: h.webformatURL, file: h.largeImageURL, license: "Pixabay Content License" }));
      }
      const j = await getJson<{ hits: { id: number; duration: number; user: string; user_id: number; pageURL: string; videos: Record<string, { url: string; width: number; height: number; thumbnail: string }> }[] }>(`https://pixabay.com/api/videos/?${params}`);
      return j.hits.map((h) => {
        const v = h.videos.large?.url ? h.videos.large : h.videos.medium;
        return { source: "pixabay", id: String(h.id), type, w: v.width, h: v.height, duration: h.duration, author: h.user, authorUrl: `https://pixabay.com/users/${h.user}-${h.user_id}/`, page: h.pageURL, preview: v.thumbnail || h.videos.medium.thumbnail, file: v.url, license: "Pixabay Content License" };
      });
    },
  },
  unsplash: {
    key: "UNSPLASH_ACCESS_KEY",
    types: ["photo"],
    async search(q, _t, n) {
      const params = new URLSearchParams({ query: q, per_page: String(Math.min(30, n * 2)), content_filter: "high" });
      if (orient) params.set("orientation", orient === "square" ? "squarish" : orient);
      const j = await getJson<{ results: UnsplashPhoto[] }>(`https://api.unsplash.com/search/photos?${params}`, { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`, "Accept-Version": "v1" });
      return j.results.map(fromUnsplash);
    },
    async one(id) {
      return fromUnsplash(await getJson<UnsplashPhoto>(`https://api.unsplash.com/photos/${id}`, { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`, "Accept-Version": "v1" }));
    },
  },
  pexels: {
    key: "PEXELS_API_KEY",
    types: ["photo", "video"],
    async search(q, type, n) {
      const params = new URLSearchParams({ query: q, per_page: String(Math.min(80, n * 2)) });
      if (orient) params.set("orientation", orient);
      const H = { Authorization: process.env.PEXELS_API_KEY! };
      if (type === "photo") {
        const j = await getJson<{ photos: { id: number; width: number; height: number; photographer: string; photographer_url: string; url: string; src: { large2x: string; original: string; medium: string } }[] }>(`https://api.pexels.com/v1/search?${params}`, H);
        return j.photos.map((x) => ({ source: "pexels", id: String(x.id), type, w: x.width, h: x.height, author: x.photographer, authorUrl: x.photographer_url, page: x.url, preview: x.src.medium, file: `${x.src.original}?auto=compress&w=2400`, license: "Pexels License" }));
      }
      const j = await getJson<{ videos: { id: number; width: number; height: number; duration: number; url: string; image: string; user: { name: string; url: string }; video_files: { link: string; width: number; height: number; quality: string }[] }[] }>(`https://api.pexels.com/videos/search?${params}`, H);
      return j.videos.map((v) => {
        const f = v.video_files.filter((x) => x.width && x.width <= 2560).sort((a, b) => b.width - a.width)[0] ?? v.video_files[0];
        return { source: "pexels", id: String(v.id), type, w: v.width, h: v.height, duration: v.duration, author: v.user.name, authorUrl: v.user.url, page: v.url, preview: v.image, file: f.link, license: "Pexels License" };
      });
    },
  },
  openverse: {
    types: ["photo"],
    async search(q, _t, n) {
      const params = new URLSearchParams({ q, license_type: "commercial,modification", page_size: String(Math.min(40, n * 2)) });
      if (orient) params.set("aspect_ratio", orient === "portrait" ? "tall" : orient === "landscape" ? "wide" : "square");
      const j = await getJson<{ results: { id: string; width: number; height: number; creator: string; creator_url: string; foreign_landing_url: string; thumbnail: string; url: string; license: string; license_version: string }[] }>(`https://api.openverse.org/v1/images/?${params}`);
      return j.results
        .filter((r) => /^(cc0|by|pdm)$/i.test(r.license))
        .map((r) => ({ source: "openverse", id: r.id, type: "photo" as const, w: r.width ?? 0, h: r.height ?? 0, author: r.creator ?? "?", authorUrl: r.creator_url, page: r.foreign_landing_url, preview: r.thumbnail, file: r.url, license: `CC ${r.license.toUpperCase()} ${r.license_version ?? ""}`.trim() }));
    },
  },
};

type UnsplashPhoto = { id: string; width: number; height: number; user: { name: string; links: { html: string } }; links: { html: string; download_location: string }; urls: { raw: string; small: string } };
const fromUnsplash = (x: UnsplashPhoto): Item => ({
  source: "unsplash",
  id: x.id,
  type: "photo",
  w: x.width,
  h: x.height,
  author: x.user.name,
  authorUrl: `${x.user.links.html}?utm_source=marcuswd_video&utm_medium=referral`,
  page: `${x.links.html}?utm_source=marcuswd_video&utm_medium=referral`,
  preview: x.urls.small,
  file: `${x.urls.raw}&w=2400&q=85&fm=jpg&fit=max`,
  license: "Unsplash License",
  download: x.links.download_location,
});

const available = (type: "photo" | "video") =>
  Object.entries(providers).filter(([, v]) => v.types.includes(type) && (!v.key || process.env[v.key]));

const search = async () => {
  const type = (s("type") ?? "photo") as "photo" | "video";
  const q = s("q") ?? pos.join(" ") ?? die("--q obrigatório");
  const n = Number(s("limit") ?? 8);
  const src = s("source") ?? "all";
  const list = src === "all" ? available(type) : available(type).filter(([k]) => k === src);
  if (!list.length) die(`nenhuma fonte disponível para ${type}${src !== "all" ? ` em ${src}` : ""} (falta chave no .env?)`);
  const results: Item[] = [];
  for (const [name, prov] of list) {
    try {
      const r = (await prov.search(q, type, n)).filter((i) => want(i.w, i.h)).slice(0, n);
      results.push(...r);
      log(`${name}: ${r.length}`);
    } catch (e) {
      log(`${name}: falhou (${String(e).slice(0, 120)})`);
    }
  }
  results.forEach((r, i) =>
    console.log(`${String(i + 1).padStart(2)}. [${r.source} ${r.id}] ${r.w}x${r.h}${r.duration ? ` ${r.duration}s` : ""} · ${r.author} · ${r.license}\n    ${r.page}`),
  );
  const dir = p("out", "_search");
  mkdirSync(dir, { recursive: true });
  const slug = q.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  writeJson(join(dir, `${type}-${slug}.json`), results);
  // folha de contato com miniaturas numeradas (para escolher olhando)
  if (opt.sheet && has("ffmpeg") && results.length) {
    const thumbs: string[] = [];
    for (const [i, r] of results.entries()) {
      const f = join(dir, `${slug}-${i + 1}.jpg`);
      try {
        const b = await fetch(r.preview, { headers: UA });
        writeFileSync(f, Buffer.from(await b.arrayBuffer()));
        thumbs.push(f);
      } catch { /* ignora miniatura */ }
    }
    const sheet = join(dir, `sheet-${type}-${slug}.jpg`);
    const font = process.platform === "win32" ? "" : ":fontcolor=white:fontsize=28:box=1:boxcolor=black@0.6:x=8:y=8";
    run("ffmpeg", sheetArgs(thumbs, sheet, { w: 360, h: 240, cols: 4, cover: true, cell: (i) => `drawtext=text='${i + 1}'${font}` }), { quiet: true });
    log(`miniaturas → ${sheet}`);
  }
  log(`resultado salvo em out/_search/${type}-${slug}.json`);
};

const get = async () => {
  const source = s("source") ?? die("--source");
  const id = s("id") ?? die("--id");
  const out = userPath(s("out") ?? die("--out <pasta do job>/stock/<nome>.jpg"));
  const type = (s("type") ?? (/\.(mp4|webm|mov)$/i.test(out) ? "video" : "photo")) as "photo" | "video";
  const prov = providers[source] ?? die(`fonte desconhecida: ${source}`);
  if (prov.key && !process.env[prov.key]) die(`${prov.key} não definida no .env`);
  // procura o item nas buscas salvas (ou consulta direto, no Unsplash)
  let item: Item | undefined;
  const dir = p("out", "_search");
  if (existsSync(dir)) {
    for (const f of (await import("node:fs")).readdirSync(dir).filter((f) => f.endsWith(".json"))) {
      item = readJson<Item[]>(join(dir, f)).find((i) => i.source === source && i.id === id && i.type === type);
      if (item) break;
    }
  }
  if (!item && prov.one) item = await prov.one(id, type);
  if (!item) die(`item ${source}/${id} não encontrado: rode o search antes`);
  const it = item!;
  if (it.download) await fetch(it.download, { headers: { ...UA, Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }).catch(() => null);
  const r = await fetch(it.file, { headers: UA });
  if (!r.ok) die(`download ${r.status}`);
  const abs = p(out);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, Buffer.from(await r.arrayBuffer()));
  // vídeo: normaliza para h264 sem áudio, até 1920 no lado maior (render mais leve e estável)
  if (type === "video" && has("ffmpeg") && !opt.raw) {
    const tmp = `${abs}.tmp.mp4`;
    run("ffmpeg", ["-y", "-loglevel", "error", "-i", abs, "-an", "-vf", "scale='if(gt(iw,ih),min(1920,iw),-2)':'if(gt(iw,ih),-2,min(1920,ih))'", "-c:v", "libx264", "-crf", "20", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", tmp], { quiet: true });
    (await import("node:fs")).renameSync(tmp, abs);
  }
  // créditos
  const cdir = dirname(abs);
  const cj = join(cdir, "credits.json");
  const credits: Record<string, unknown>[] = existsSync(cj) ? readJson(cj) : [];
  const rel = out.replace(/^public\//, "");
  credits.push({ file: rel, source, id, author: it.author, authorUrl: it.authorUrl, page: it.page, license: it.license, date: new Date().toISOString().slice(0, 10) });
  writeJson(cj, credits);
  const label = { pixabay: "Pixabay", unsplash: "Unsplash", pexels: "Pexels", openverse: "Openverse" }[source] ?? source;
  appendFileSync(join(cdir, "CREDITS.md"), `- ${rel}: ${type === "video" ? "Vídeo" : "Foto"} de ${it.author} no ${label} (${it.page}) · ${it.license}\n`);
  log(`ok → ${out} (${it.w}x${it.h}, ${it.author} / ${label})`);
};

// ── imagem por IA ──
const findBrand = (from: string): string | undefined => {
  for (let d = from, i = 0; i < 4; i++, d = dirname(d)) if (existsSync(join(d, "brand.json"))) return join(d, "brand.json");
  return undefined;
};
const gen = async () => {
  const prompt = s("prompt") ?? die('--prompt "o que gerar" (sem pessoas: fundos, objetos, texturas, ilustrações)');
  const out = userPath(s("out") ?? die("--out <pasta do job>/img/<nome>.jpg"));
  const account = process.env.CF_ACCOUNT_ID ?? die("CF_ACCOUNT_ID não definida (conta grátis em dash.cloudflare.com > AI > Workers AI)");
  const token = process.env.CF_API_TOKEN ?? die("CF_API_TOKEN não definida (token com permissão Workers AI)");
  const brandFile = s("brand") ? userPath(s("brand")!.endsWith(".json") ? s("brand")! : join(s("brand")!, "brand.json")) : findBrand(dirname(out));
  const brand = brandFile && existsSync(brandFile) ? readJson<GenBrand>(brandFile) : undefined;
  const full = buildPrompt(prompt, { brand, style: s("style") });
  const n = Math.max(1, Math.min(8, Number(s("variants") ?? 1)));
  const base = Number(s("seed") ?? Math.floor(Math.random() * 1e6));
  log(`gerando ${n} imagem(ns)${brand ? ` com a paleta de ${brandFile}` : ""}…`);
  const files = variantNames(out, n);
  mkdirSync(dirname(out), { recursive: true });
  for (const [i, f] of files.entries()) {
    const { url, init } = genRequest(account, token, full, { steps: Number(s("steps") ?? 4), seed: base + i });
    const r = await fetch(url, init);
    const body = await r.json().catch(() => ({}));
    if (!r.ok) die(`Cloudflare ${r.status}: ${(body as { errors?: { message: string }[] }).errors?.map((e) => e.message).join("; ") ?? ""}`);
    writeFileSync(f, genImage(body));
    appendFileSync(join(dirname(f), "CREDITS.md"), `- ${f.split(/[\\/]/).pop()}: imagem gerada por IA (FLUX.1 schnell, Apache 2.0, Cloudflare Workers AI), seed ${base + i}: "${prompt}"\n`);
    log(`ok → ${f}`);
  }
  if (n > 1 && has("ffmpeg")) {
    const sheet = out.replace(/(\.[a-z0-9]+)?$/i, "-opcoes.jpg");
    const font = process.platform === "win32" ? "" : ":fontcolor=white:fontsize=40:box=1:boxcolor=black@0.6:x=12:y=12";
    try {
      run("ffmpeg", sheetArgs(files, sheet, { w: 400, h: 400, cols: 4, cover: true, cell: (i) => `drawtext=text='${i + 1}'${font}` }), { quiet: true });
    } catch {
      // sem fonte para o número (drawtext): a folha sai sem numeração, na mesma ordem dos arquivos
      run("ffmpeg", sheetArgs(files, sheet, { w: 400, h: 400, cols: 4, cover: true }), { quiet: true });
    }
    log(`opções lado a lado → ${sheet} (escolha uma e apague as outras)`);
  }
};

const main = async () => {
  if (pos[0] === "search") { pos.shift(); return search(); }
  if (pos[0] === "get") return get();
  if (pos[0] === "gen") return gen();
  console.log("uso: pnpm media search --type photo|video --q \"termo\" [--orientation portrait] [--sheet]\n     pnpm media get --source pixabay --id 123 --out <pasta do job>/stock/nome.jpg\n     pnpm media gen --prompt \"fundo abstrato\" --out <pasta do job>/img/fundo.jpg [--variants 4]");
};
main().catch((e) => { console.error(e); process.exit(1); });
