import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { p } from "./env.ts";
import { fileOf, openWorkspace, relocate, stage } from "./workspace.ts";

// C:\sites\cliente\videos\brand.json + videos\promo\job.json, como na pasta de um cliente
const root = mkdtempSync(join(tmpdir(), "reel ws "));
after(() => rmSync(root, { recursive: true, force: true }));
const videos = join(root, "videos");
const promo = join(videos, "promo");
const put = (f: string, data = "x") => { mkdirSync(join(f, ".."), { recursive: true }); writeFileSync(f, data); };
put(join(videos, "brand.json"), JSON.stringify({ slug: "cliente", logo: { light: "logo.svg" }, fonts: { heading: { files: { 700: "fonts/f-700.woff2" } } } }));
put(join(videos, "fonts", "nao-usada.woff2"));
put(join(videos, "outro-job", "entregas", "grande.mp4"));
put(join(videos, "fonts", "f-700.woff2"));
put(join(videos, "logo.svg"));
put(join(promo, "job.json"), JSON.stringify({ slug: "promo", brand: "cliente" }));
put(join(promo, "img", "foto 1.jpg"));
put(join(promo, "out", "stills", "velho.jpg"));
put(join(promo, "entregas", "2026-10-31", "promo.mp4"));

describe("pasta do job", () => {
  test("acha a marca na pasta de cima", () => {
    const w = openWorkspace(promo);
    assert.equal(w.slug, "promo");
    assert.equal(w.brandFile, join(videos, "brand.json"));
    assert.equal(w.brandPrefix, "_brand/");
  });
  test("caminho relativo vale a partir de onde o comando foi chamado (pnpm --dir guarda em INIT_CWD)", () => {
    const old = process.env.INIT_CWD;
    process.env.INIT_CWD = videos;
    try { assert.equal(openWorkspace("promo").dir, promo); } finally { if (old === undefined) delete process.env.INIT_CWD; else process.env.INIT_CWD = old; }
  });
  test("brand.json na própria pasta usa o prefixo do job", () => {
    const solo = join(root, "solo");
    put(join(solo, "brand.json"), "{}");
    put(join(solo, "job.json"), JSON.stringify({ slug: "solo", brand: "brand.json" }));
    assert.equal(openWorkspace(solo).brandPrefix, "solo/");
  });
  test("caminhos relativos viram caminhos da public; o resto fica igual", () => {
    const job = { brand: "cliente", music: { file: "audio/nao-existe.mp3" }, scenes: [{ title: "Foto 1", media: "img/foto 1.jpg", avatar: "./img/foto 1.jpg", url: "https://x.com/a.jpg", src: "promo/img/foto 1.jpg" }] };
    const r = relocate(job, promo, "promo/");
    assert.deepEqual(r.scenes[0], { title: "Foto 1", media: "promo/img/foto 1.jpg", avatar: "promo/img/foto 1.jpg", url: "https://x.com/a.jpg", src: "promo/img/foto 1.jpg" });
    assert.equal(r.music.file, "audio/nao-existe.mp3");
    assert.equal(r.brand, "cliente");
    const brand = relocate({ logo: { light: "logo.svg" }, fonts: { heading: { files: { 700: "fonts/f-700.woff2" } } } }, videos, "_brand/");
    assert.equal(brand.logo.light, "_brand/logo.svg");
    assert.equal(brand.fonts.heading.files[700], "_brand/fonts/f-700.woff2");
  });
  test("fileOf traduz de volta para o disco", () => {
    const w = openWorkspace(promo);
    assert.equal(fileOf("promo/voice/pt-br/a.mp3", w), join(promo, "voice", "pt-br", "a.mp3"));
    assert.equal(fileOf("_brand/logo.svg", w), join(videos, "logo.svg"));
    assert.equal(fileOf("_lib/sfx/pop.mp3", w), p("public", "_lib", "sfx", "pop.mp3"));
  });
  test("bundle recebe o material, sem out/ nem entregas/, e da marca só o que ela usa", () => {
    const pub = join(root, "bundle-public");
    stage(pub, "copy", openWorkspace(promo));
    assert.deepEqual(readdirSync(join(pub, "promo")).sort(), ["img", "job.json"]);
    assert.deepEqual(readdirSync(join(pub, "_brand")).sort(), ["brand.json", "fonts", "logo.svg"]);
    assert.deepEqual(readdirSync(join(pub, "_brand", "fonts")), ["f-700.woff2"]);
  });
});
