import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { brand as brandOf } from "../../src/core/testing.ts";
import { checkJob, type Disk } from "./check.ts";

const files = new Set(["img/foto.jpg", "clips/fala.pt-br.captions.json", "clips/fala.mp4"]);
const disk = (over: Partial<Disk> = {}): Disk => ({
  job: (r) => files.has(r), brand: (r) => r === "logo.svg", engine: (r) => r === "_lib/sfx" || r === "_lib/sfx/pop.mp3",
  i18n: () => null, voiced: () => [], ...over,
});
const brand = { ...brandOf(), logo: { light: "logo.svg", plate: "none" } };
const job = (scenes: unknown[], extra: Record<string, unknown> = {}) => ({ slug: "promo", brand: "x", scenes, ...extra });

describe("check", () => {
  test("job válido: sem erros", () => {
    const r = checkJob(job([{ id: "a", type: "split", title: "x", media: "img/foto.jpg" }, { id: "b", type: "media", media: { src: "clips/fala.mp4", captions: "clips/fala.{lang}.captions.json" } }]), brand, disk(), "promo");
    assert.deepEqual(r, { errors: [], warnings: [] });
  });
  test("schema: diz o campo", () => {
    const r = checkJob(job([{ id: "a", type: "logo", transition: "spin" }]), { ...brand, colors: { ...brand.colors, bg: "azul" } }, disk(), "promo");
    assert.equal(r.errors.length, 2);
    assert.match(r.errors[0], /^job\.json: scenes\.0\.transition: /);
    assert.match(r.errors[1], /^brand\.json: colors\.bg: /);
  });
  test("material, fonte, efeito e id repetido", () => {
    const b = { ...brand, fonts: { ...brand.fonts, heading: { ...brand.fonts.heading, files: { 800: "fonts/x.woff2" } } } };
    const r = checkJob(job([
      { id: "a", type: "gallery", items: ["img/foto.jpg", "img/b.jpg"] },
      { id: "a", type: "logo", sfx: "boom" },
      { id: "c", type: "quote", text: "x", author: "y", avatar: "https://site/a.jpg" },
    ]), b, disk(), "promo");
    assert.deepEqual(r.errors, [
      'job.json: scenes: id "a" repetido',
      "job.json: scenes.0 (a).items.1: arquivo não encontrado: img/b.jpg",
      "job.json: scenes.1 (a).sfx: efeito não encontrado: _lib/sfx/boom.mp3",
      "brand.json: fonts.heading.files.800: arquivo não encontrado: fonts/x.woff2",
    ]);
  });
  test("legenda por idioma: cada idioma precisa do seu arquivo", () => {
    const r = checkJob(job([{ id: "b", type: "media", media: { src: "clips/fala.mp4", captions: "clips/fala.{lang}.captions.json" } }], { langs: ["pt-BR", "en"] }), brand, disk({ i18n: () => ({ "b.title": "" }) }), "promo");
    assert.deepEqual(r.errors, ["job.json: scenes.0 (b).media.captions: arquivo não encontrado: clips/fala.en.captions.json"]);
    assert.deepEqual(r.warnings, ["en: 1 texto(s) sem tradução em i18n/en.json"]);
  });
  test("locução faltando é aviso, não erro", () => {
    const r = checkJob(job([{ id: "a", type: "statement", text: "x", voice: "x" }], { voice: { provider: "piper" } }), brand, disk(), "promo");
    assert.deepEqual(r, { errors: [], warnings: ["pt-BR: locução faltando em a (pnpm video voice <pasta> --lang pt-BR)"] });
  });
  test("cara de slideshow: texto atrás de texto vira aviso", () => {
    const t = (id: string) => ({ id, type: "statement", text: "x" });
    const r = checkJob(job([t("a"), t("b"), t("c"), { id: "d", type: "chart", items: [{ label: "x", value: 1 }] }, t("e")]), brand, disk(), "promo");
    assert.equal(r.errors.length, 0);
    assert.match(r.warnings[0], /3 cenas seguidas só de texto \(a, b, c\)/);
    assert.match(r.warnings[1], /só 1 de 5 cenas têm visual/);
  });
});
