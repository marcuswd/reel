#!/usr/bin/env node
// Copia o vídeo final (e thumb + créditos, se existirem) para a pasta de destino.
//   node scripts/export.mjs --slug <slug> [--dest "D:\Videos\Clientes"] [--name nome-final]
// Destino: --dest ou EXPORT_DIR no .env. Cria <dest>/<slug>/<AAAA-MM-DD>/ e nunca sobrescreve.

import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";

if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const a = process.argv.slice(2);
const arg = (k) => { const i = a.indexOf(`--${k}`); return i >= 0 ? a[i + 1] : undefined; };
const slug = arg("slug");
const dest = arg("dest") ?? process.env.EXPORT_DIR;
if (!slug) { console.error("--slug obrigatório"); process.exit(1); }
if (!dest) { console.error("Defina EXPORT_DIR no .env ou passe --dest"); process.exit(1); }

const day = new Date().toLocaleDateString("sv-SE"); // AAAA-MM-DD
const target = resolve(dest, slug, day);
mkdirSync(target, { recursive: true });

const name = arg("name") ?? slug;
const files = [
  [`out/${slug}.mp4`, `${name}.mp4`],
  [`out/${slug}-thumb.png`, `${name}-thumb.png`],
  [`public/${slug}/audio/CREDITS.md`, `${name}-creditos.md`],
].filter(([src]) => existsSync(src));

if (!files.some(([src]) => src.endsWith(".mp4"))) { console.error(`out/${slug}.mp4 não encontrado. Renderize antes.`); process.exit(1); }

const free = (p) => {
  if (!existsSync(p)) return p;
  const ext = extname(p), base = p.slice(0, -ext.length);
  for (let i = 2; ; i++) if (!existsSync(`${base}-v${i}${ext}`)) return `${base}-v${i}${ext}`;
};

for (const [src, out] of files) {
  const to = free(join(target, out));
  copyFileSync(src, to);
  console.log(`${src} -> ${to} (${(statSync(to).size / 1048576).toFixed(1)} MB)`);
}
