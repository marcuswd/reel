#!/usr/bin/env node
// Busca e baixa trilhas e efeitos sonoros com licença liberada para uso comercial.
// Fontes: Openverse (sem chave), Freesound (FREESOUND_TOKEN), Jamendo (JAMENDO_CLIENT_ID).
// Aceita só CC0, CC-BY e Public Domain Mark (sem NC, sem ND, sem SA).
//
//   node scripts/audio.mjs search --type sfx|music --q "whoosh" [--source openverse|freesound|jamendo|all] [--max-dur 5] [--limit 10]
//   node scripts/audio.mjs get --source openverse|freesound|jamendo --id <id> --out <pasta do job>/audio/<nome>.mp3 [--no-normalize]

import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

// .env simples, sem dependência
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const { FREESOUND_TOKEN, JAMENDO_CLIENT_ID } = process.env;

const [cmd, ...rest] = process.argv.slice(2);
const args = {};
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith("--")) {
    const k = rest[i].slice(2);
    const v = rest[i + 1] && !rest[i + 1].startsWith("--") ? rest[++i] : true;
    args[k] = v;
  }
}

const UA = { "User-Agent": "remotion-base/0.1 (marcuswd.dev)" };
const getJson = async (url) => {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url.replace(/(token|client_id)=[^&]+/, "$1=***")}`);
  return r.json();
};

// Licença permitida: cc0, by, pdm. Recusa nc, nd, sa.
const okLicense = (code) => /^(cc0|by|pdm|publicdomain)$/i.test(String(code).replace(/[-\s].*$/, "")) && !/nc|nd|sa/i.test(code);
const ccFromUrl = (u = "") => (u.match(/licenses\/([a-z-]+)\//)?.[1] ?? (u.includes("publicdomain") ? "cc0" : "?"));

const openverse = {
  async search({ q, type, maxDur, limit }) {
    const p = new URLSearchParams({ q, license_type: "commercial,modification", page_size: String(Math.min(limit * 2, 40)) });
    p.set("category", type === "music" ? "music" : "sound_effect");
    const { results } = await getJson(`https://api.openverse.org/v1/audio/?${p}`);
    return results
      .filter((r) => okLicense(r.license))
      .filter((r) => !maxDur || (r.duration ?? 0) / 1000 <= maxDur)
      .map((r) => ({ source: "openverse", id: r.id, title: r.title, creator: r.creator, duration: Math.round((r.duration ?? 0) / 1000), license: `${r.license} ${r.license_version ?? ""}`.trim(), provider: r.source, landing: r.foreign_landing_url, file: r.url }));
  },
  async detail(id) {
    const r = await getJson(`https://api.openverse.org/v1/audio/${id}/`);
    return { title: r.title, creator: r.creator, license: `${r.license} ${r.license_version ?? ""}`.trim(), licenseUrl: r.license_url, landing: r.foreign_landing_url, file: r.url, ok: okLicense(r.license) };
  },
};

const freesound = {
  fields: "id,name,username,license,duration,previews,url",
  async search({ q, maxDur, limit }) {
    if (!FREESOUND_TOKEN) throw new Error("FREESOUND_TOKEN ausente no .env");
    const filter = [`license:("Creative Commons 0" OR "Attribution")`, maxDur ? `duration:[0 TO ${maxDur}]` : ""].filter(Boolean).join(" ");
    const p = new URLSearchParams({ query: q, filter, fields: this.fields, page_size: String(limit), sort: "rating_desc", token: FREESOUND_TOKEN });
    const { results } = await getJson(`https://freesound.org/apiv2/search/text/?${p}`);
    return results.map((r) => ({ source: "freesound", id: r.id, title: r.name, creator: r.username, duration: Math.round(r.duration), license: ccFromUrl(r.license), landing: r.url, file: r.previews["preview-hq-mp3"] }));
  },
  async detail(id) {
    const r = await getJson(`https://freesound.org/apiv2/sounds/${id}/?fields=${this.fields}&token=${FREESOUND_TOKEN}`);
    const lic = ccFromUrl(r.license);
    return { title: r.name, creator: r.username, license: lic, licenseUrl: r.license, landing: r.url, file: r.previews["preview-hq-mp3"], ok: okLicense(lic) };
  },
};

const jamendo = {
  async search({ q, maxDur, limit }) {
    if (!JAMENDO_CLIENT_ID) throw new Error("JAMENDO_CLIENT_ID ausente no .env");
    const p = new URLSearchParams({ client_id: JAMENDO_CLIENT_ID, format: "json", limit: "50", search: q, vocalinstrumental: "instrumental", audiodlformat: "mp32", order: "popularity_total" });
    if (maxDur) p.set("durationbetween", `0_${maxDur}`);
    const { results } = await getJson(`https://api.jamendo.com/v3.0/tracks/?${p}`);
    return results
      .filter((r) => r.audiodownload_allowed && okLicense(ccFromUrl(r.license_ccurl)))
      .slice(0, limit)
      .map((r) => ({ source: "jamendo", id: r.id, title: r.name, creator: r.artist_name, duration: r.duration, license: ccFromUrl(r.license_ccurl), landing: r.shareurl, file: r.audiodownload }));
  },
  async detail(id) {
    const { results: [r] } = await getJson(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&id=${id}&audiodlformat=mp32`);
    const lic = ccFromUrl(r.license_ccurl);
    return { title: r.name, creator: r.artist_name, license: lic, licenseUrl: r.license_ccurl, landing: r.shareurl, file: r.audiodownload, ok: r.audiodownload_allowed && okLicense(lic) };
  },
};

const sources = { openverse, freesound, jamendo };

async function search() {
  const q = args.q;
  if (!q) throw new Error("--q obrigatório");
  const type = args.type === "music" ? "music" : "sfx";
  const limit = Number(args.limit ?? 8);
  const maxDur = args["max-dur"] ? Number(args["max-dur"]) : undefined;
  const pick = args.source && args.source !== "all" ? [args.source] : type === "music" ? ["openverse", "jamendo"] : ["freesound", "openverse"];
  const out = [];
  for (const s of pick) {
    try { out.push(...(await sources[s].search({ q, type, maxDur, limit }))); }
    catch (e) { console.error(`[${s}] ${e.message}`); }
  }
  console.log(JSON.stringify(out, null, 2));
}

async function get() {
  const { source, id, out } = args;
  if (!sources[source] || !id || !out) throw new Error("uso: get --source <s> --id <id> --out <arquivo.mp3>");
  const d = await sources[source].detail(id);
  if (!d.ok) throw new Error(`licença não permitida (${d.license}). Escolha outro.`);
  if (!d.file) throw new Error("sem URL de download");
  mkdirSync(dirname(out), { recursive: true });
  const r = await fetch(d.file, { headers: UA });
  if (!r.ok) throw new Error(`download ${r.status}`);
  const raw = out.replace(/\.mp3$/i, "") + ".raw";
  writeFileSync(raw, Buffer.from(await r.arrayBuffer()));

  // Normaliza para -16 LUFS e converte para mp3. O mix fica no código (volume do <Audio>).
  const ff = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", raw, ...(args["no-normalize"] ? [] : ["-af", "loudnorm=I=-16:TP=-1.5:LRA=11"]), "-ar", "48000", "-b:a", "192k", out]);
  if (ff.status !== 0) {
    console.error("ffmpeg indisponível ou falhou; salvando o original sem normalizar");
    renameSync(raw, out);
  } else {
    unlinkSync(raw);
  }

  // Créditos ao lado do áudio
  const dir = dirname(out);
  const entry = { file: out.split(/[\\/]/).pop(), source, id, ...d, downloadedAt: new Date().toISOString() };
  delete entry.ok;
  const jsonPath = join(dir, "credits.json");
  const list = existsSync(jsonPath) ? JSON.parse(readFileSync(jsonPath, "utf8")) : [];
  writeFileSync(jsonPath, JSON.stringify([...list.filter((x) => x.file !== entry.file), entry], null, 2));
  appendFileSync(join(dir, "CREDITS.md"), `- \`${entry.file}\`: "${d.title}" por ${d.creator} (${source}), ${d.license} ${d.licenseUrl ?? ""} ${d.landing ?? ""}\n`);
  console.log(JSON.stringify(entry, null, 2));
}

const run = { search, get }[cmd];
if (!run) { console.error("comandos: search | get"); process.exit(1); }
run().catch((e) => { console.error(e.message); process.exit(1); });
