import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, test } from "node:test";
import { brandSchema, jobSchema } from "../../src/core/schema.ts";
import { p } from "./env.ts";
import { applyToJob, buildBrand, deepMerge, fontPlan, insideDir, mergeRecipes, parseRecipeSpec, stripWeights, type Recipe } from "./recipe.ts";

const load = (name: string) => JSON.parse(readFileSync(p("recipes", `${name}.json`), "utf8")) as Recipe;
const base = { slug: "x", brand: "brand", lang: "pt-BR", formats: ["16:9"], music: { mode: "generate" }, voice: { provider: "none" }, captions: { mode: "both", style: "pop" }, scenes: [{ id: "a", type: "statement", text: "Oi" }] };

describe("receitas: merge puro", () => {
  test("deepMerge não muta e substitui listas", () => {
    const a = { x: { y: 1, z: [1, 2] }, k: 1 };
    const r = deepMerge(a, { x: { z: [3] }, k: undefined });
    assert.deepEqual(r, { x: { y: 1, z: [3] }, k: 1 });
    assert.deepEqual(a, { x: { y: 1, z: [1, 2] }, k: 1 });
  });
  test("sintaxe com + herda a pasta do primeiro", () => {
    assert.deepEqual(parseRecipeSpec("dark/noir-frio+curiosidades"), ["dark/noir-frio", "dark/curiosidades"]);
    assert.deepEqual(parseRecipeSpec("dark/a+other/b"), ["dark/a", "other/b"]);
  });
  test("recusa nome que sai da pasta", () => {
    assert.throws(() => parseRecipeSpec("../x"));
    assert.throws(() => parseRecipeSpec("dark/a/b"));
    assert.throws(() => parseRecipeSpec(""));
  });
  test("a flag do usuário vence a receita, a receita vence o base", () => {
    const m = mergeRecipes([{ name: "a", kind: "style", job: { pace: "calm", voice: { provider: "kokoro" } } }]);
    const job = applyToJob(base, m, { voice: { provider: "piper" } });
    assert.equal((job.voice as { provider: string }).provider, "piper");
    assert.equal(job.pace, "calm");
  });
  test("última receita vence e licenças não repetem", () => {
    const l = { kind: "font", name: "F", license: "OFL", url: "u" };
    const m = mergeRecipes([
      { name: "a", kind: "style", job: { pace: "calm" }, licenses: [l] },
      { name: "b", kind: "narration", job: { pace: "fast" }, licenses: [l, { ...l, name: "G" }] },
    ]);
    assert.equal(m.job.pace, "fast");
    assert.equal(m.licenses.length, 2);
  });
  test("marca do cliente entra só com identidade, nunca a cor", () => {
    const client = { slug: "acme", name: "Acme", colors: { primary: "#ff0000", bg: "#ffffff" }, logo: { light: "logo.svg", plate: "none" }, contact: { site: "acme.com" }, fonts: { heading: { family: "Comic" } } };
    const b = buildBrand({ colors: { bg: "#07090d", primary: "#4f9fb2" }, fonts: { heading: { family: "Barlow Condensed" } } }, client, { slug: "s", name: "S" }) as {
      name: string; colors: { bg: string; primary: string }; fonts: { heading: { family: string } }; logo: { light: string };
    };
    assert.equal(b.name, "Acme");
    assert.equal(b.colors.bg, "#07090d");
    assert.equal(b.colors.primary, "#4f9fb2");
    assert.equal(b.fonts.heading.family, "Barlow Condensed");
    assert.equal(b.logo.light, "logo.svg");
  });
});

describe("receitas dark em disco", () => {
  const files = readdirSync(p("recipes", "dark")).filter((f) => f.endsWith(".json"));
  test("existem as duas do plano", () => assert.ok(files.includes("noir-frio.json") && files.includes("curiosidades.json")));
  const m = mergeRecipes(["dark/noir-frio", "dark/curiosidades"].map(load));
  test("job resultante passa no schema do job", () => {
    const r = jobSchema.safeParse(applyToJob(base, m));
    assert.ok(r.success, r.success ? "" : JSON.stringify(r.error.issues));
    if (r.success) {
      assert.equal(r.data.music.mood, "drone");
      assert.equal(r.data.voice.provider, "kokoro");
      assert.equal(r.data.voice.voiceId, "pm_alex");
      assert.equal(r.data.captions.style, "pop");
      assert.equal(r.data.pace, "calm");
      assert.equal(r.data.defaults.camera, "dolly");
    }
  });
  test("marca resultante passa no schema e usa fundo #07090d", () => {
    const r = brandSchema.safeParse(stripWeights(buildBrand(m.brand, undefined, { slug: "x", name: "X" })));
    assert.ok(r.success, r.success ? "" : JSON.stringify(r.error.issues));
    if (r.success) {
      assert.equal(r.data.colors.bg, "#07090d");
      assert.equal(r.data.fonts.heading.uppercase, true);
    }
  });
  test("plano de fontes e licenças (OFL e Apache)", () => {
    assert.deepEqual(fontPlan(m.brand).map((f) => f.family), ["Barlow Condensed", "Barlow Condensed"]);
    const ls = m.licenses.map((l) => l.license).join("|");
    assert.match(ls, /OFL/);
    assert.match(ls, /Apache/);
    assert.ok(m.licenses.every((l) => l.url.startsWith("https://")));
  });
});

describe("receitas: segurança do merge e do caminho", () => {
  test("deepMerge ignora __proto__, constructor e prototype", () => {
    const o = deepMerge({}, JSON.parse('{"__proto__":{"x":1},"constructor":{"y":1},"ok":2}'));
    assert.equal(Object.getPrototypeOf(o), Object.prototype);
    assert.deepEqual(Object.keys(o), ["ok"]);
  });
  test("insideDir recusa .., absoluto e a própria pasta", () => {
    const d = join(tmpdir(), "job");
    assert.ok(insideDir(d, "logo.svg"));
    assert.ok(insideDir(d, "img/logo.svg"));
    assert.equal(insideDir(d, "../fora.svg"), undefined);
    assert.equal(insideDir(d, "a/../../fora.svg"), undefined);
    assert.equal(insideDir(d, join(tmpdir(), "x.svg")), undefined);
    assert.equal(insideDir(d, "."), undefined);
  });
});

describe("video new --recipe (pasta temporária, sem baixar fontes)", () => {
  const root = mkdtempSync(join(tmpdir(), "reel recipe "));
  after(() => rmSync(root, { recursive: true, force: true }));
  const cli = (args: string[]) => spawnSync(process.execPath, ["--import", "tsx", p("scripts", "video.ts"), ...args], { cwd: p(), encoding: "utf8" });

  test("gera job e marca da receita, copia o logo, não herda a cor e recusa brand.json existente", () => {
    const cliente = join(root, "cliente");
    mkdirSync(cliente);
    writeFileSync(join(cliente, "logo.svg"), "<svg xmlns='http://www.w3.org/2000/svg'/>");
    writeFileSync(join(cliente, "brand.json"), JSON.stringify({ slug: "acme", name: "Acme", colors: { primary: "#ff0000" }, logo: { light: "logo.svg", plate: "none" }, contact: { site: "acme.com" } }));
    const dir = join(cliente, "promo");
    const r = cli(["new", dir, "--brand", join(cliente, "brand.json"), "--recipe", "dark/noir-frio+curiosidades", "--no-fonts"]);
    assert.equal(r.status, 0, `${r.stdout}
${r.stderr}`);
    const brand = JSON.parse(readFileSync(join(dir, "brand.json"), "utf8"));
    assert.equal(brand.name, "Acme");
    assert.notEqual(brand.colors.primary, "#ff0000");
    assert.ok(existsSync(join(dir, "logo.svg")));
    assert.ok(existsSync(join(dir, "recipe.json")));
    const job = JSON.parse(readFileSync(join(dir, "job.json"), "utf8"));
    assert.notEqual(job.scenes[0].logo, true);
    const again = cli(["new", join(cliente, "promo2"), "--recipe", "dark/noir-frio", "--no-fonts"]);
    assert.equal(again.status, 0, again.stderr);
    mkdirSync(join(cliente, "promo3"));
    writeFileSync(join(cliente, "promo3", "brand.json"), "{}");
    assert.notEqual(cli(["new", join(cliente, "promo3"), "--recipe", "dark/noir-frio", "--no-fonts"]).status, 0);
  });
});
