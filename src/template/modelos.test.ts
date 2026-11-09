import assert from "node:assert/strict";
import { test } from "node:test";
import { jobSchema } from "../core/schema";
import { MODELOS } from "./modelos";

test("cada modelo do catálogo vira um job válido, curto e com chamada final", () => {
  const ids = new Set<string>();
  for (const m of MODELOS) {
    assert.ok(!ids.has(m.id), `id repetido: ${m.id}`); ids.add(m.id);
    const r = jobSchema.safeParse({ slug: "teste", brand: "b", formats: m.formatos, pace: m.pace, music: { mode: "generate", mood: m.mood }, scenes: m.cenas });
    assert.ok(r.success, `${m.id}: ${r.success ? "" : r.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`);
    assert.ok(m.cenas.length >= 4 && m.cenas.length <= 6, `${m.id}: 4 a 6 cenas para 15 a 20 s`);
    assert.equal(m.cenas.at(-1)?.type, "cta", `${m.id}: termina com a chamada`);
    assert.ok(m.material.length > 0, `${m.id}: diz o material a pedir`);
  }
});
