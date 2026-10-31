import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, test } from "node:test";
import { brandSchema, jobSchema } from "./schema";
import { brand, job } from "./testing";

const ROOT = resolve(import.meta.dirname, "..", "..");
const read = (f: string) => JSON.parse(readFileSync(f, "utf8").replace(/^﻿/, ""));
const issues = (r: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) => r.error?.issues.map((i) => i.path.join(".")) ?? [];

describe("job", () => {
  test("padrões preenchidos", () => {
    const j = job({ scenes: [{ id: "a", type: "logo" }] });
    assert.deepEqual(j.formats, ["16:9"]);
    assert.equal(j.fps, 30);
    assert.equal(j.pace, "normal");
    assert.equal(j.music.mode, "generate");
    assert.equal(j.captions.mode, "both");
    assert.equal(j.sfx.enabled, true);
  });
  test("erros apontam o campo", () => {
    const base = { slug: "ok", brand: "b", scenes: [{ id: "a", type: "logo" }] };
    assert.deepEqual(issues(jobSchema.safeParse({ ...base, slug: "Com Espaço" })), ["slug"]);
    assert.deepEqual(issues(jobSchema.safeParse({ ...base, scenes: [] })), ["scenes"]);
    assert.deepEqual(issues(jobSchema.safeParse({ ...base, formats: ["21:9"] })), ["formats.0"]);
    assert.deepEqual(issues(jobSchema.safeParse({ ...base, scenes: [{ id: "a", type: "list", title: "x", items: [] }] })), ["scenes.0.items"]);
    assert.deepEqual(issues(jobSchema.safeParse({ ...base, scenes: [{ id: "a", type: "video" }] })), ["scenes.0.type"]);
    assert.deepEqual(issues(jobSchema.safeParse({ ...base, scenes: [{ id: "a", type: "logo", transition: "spin" }] })), ["scenes.0.transition"]);
  });
});

describe("marca", () => {
  test("padrões preenchidos", () => {
    const b = brand();
    assert.equal(b.motion.energy, "normal");
    assert.equal(b.audio.bpm, 110);
    assert.equal(b.logo.plate, "none");
    assert.equal(b.fonts.heading.scale, 1);
  });
  test("cor fora do formato hex é recusada", () => {
    const r = brandSchema.safeParse({ ...brand(), colors: { ...brand().colors, bg: "azul" } });
    assert.deepEqual(issues(r), ["colors.bg"]);
  });
});

// Tudo que está no repositório precisa passar no schema (o build depende disso).
describe("arquivos do repositório", () => {
  for (const d of readdirSync(join(ROOT, "jobs"), { withFileTypes: true }).filter((d) => d.isDirectory())) {
    test(`jobs/${d.name}/job.json`, () => {
      const r = jobSchema.safeParse(read(join(ROOT, "jobs", d.name, "job.json")));
      assert.ok(r.success, issues(r).join(", "));
      assert.equal(r.data!.slug, d.name);
    });
  }
  for (const f of readdirSync(join(ROOT, "brands")).filter((f) => f.endsWith(".json"))) {
    test(`brands/${f}`, () => {
      const r = brandSchema.safeParse(read(join(ROOT, "brands", f)));
      assert.ok(r.success, issues(r).join(", "));
    });
  }
});
