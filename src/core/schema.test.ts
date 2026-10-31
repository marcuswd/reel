import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { brandSchema, jobSchema } from "./schema";
import { brand, job } from "./testing";

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
