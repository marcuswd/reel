import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MAX_PARTICLES, clampCount, flicker, mulberry32, particlePositions, ribBars, travel } from "./dark3d";
import { jobSchema } from "./schema";
import { props } from "./testing";
import { planTimeline, readingSeconds, sceneWords } from "./timeline";

const job = (scene: Record<string, unknown>) => ({ slug: "t", brand: "t", scenes: [{ id: "d", type: "dark3d", ...scene }] });

describe("dark3d: schema", () => {
  test("aceita os três ambientes e os campos opcionais", () => {
    for (const env of ["corredor", "poeira", "vazio"]) assert.equal(jobSchema.safeParse(job({ env })).success, true);
    const r = jobSchema.safeParse(job({ env: "poeira", seed: 3, lightColor: "#5fa8b8", fogDensity: 0.1, speed: 1, depth: 50, ribs: 10, count: 5000, size: 0.04, drift: 0.2, title: "x" }));
    assert.equal(r.success, true);
  });
  test("env é obrigatório e fechado; cor e limites são validados", () => {
    assert.equal(jobSchema.safeParse(job({})).success, false);
    assert.equal(jobSchema.safeParse(job({ env: "planeta" })).success, false);
    assert.equal(jobSchema.safeParse(job({ env: "vazio", lightColor: "ciano" })).success, false);
    assert.equal(jobSchema.safeParse(job({ env: "vazio", ribs: 0 })).success, false);
    assert.equal(jobSchema.safeParse(job({ env: "vazio", count: -1 })).success, false);
  });
});

describe("dark3d: PRNG e posições", () => {
  test("mesma semente, mesmas posições; semente diferente, outras", () => {
    const a = particlePositions(5, 500, [10, 6, 20]);
    const b = particlePositions(5, 500, [10, 6, 20]);
    const c = particlePositions(6, 500, [10, 6, 20]);
    assert.deepEqual(Array.from(a), Array.from(b));
    assert.notDeepEqual(Array.from(a), Array.from(c));
    assert.equal(a.length, 1500);
  });
  test("mulberry32 em [0,1) e reproduzível", () => {
    const r1 = mulberry32(1), r2 = mulberry32(1);
    for (let i = 0; i < 100; i++) { const v = r1(); assert.equal(v, r2()); assert.ok(v >= 0 && v < 1); }
  });
  test("posições ficam dentro da caixa", () => {
    const p = particlePositions(2, 1000, [10, 6, 20]);
    for (let i = 0; i < p.length; i += 3) assert.ok(Math.abs(p[i]) <= 5 && Math.abs(p[i + 1]) <= 3 && p[i + 2] <= 0 && p[i + 2] >= -20);
  });
  test("nervuras: 4 barras por nervura, determinísticas", () => {
    const a = ribBars(1, 10, 50, 3, 2.5);
    assert.equal(a.length, 40);
    assert.deepEqual(a, ribBars(1, 10, 50, 3, 2.5));
  });
});

describe("dark3d: limites e tempo", () => {
  test("contagem sob 20 mil, inteira, nunca negativa", () => {
    assert.equal(clampCount(1e9, 100), MAX_PARTICLES);
    assert.ok(MAX_PARTICLES < 20000);
    assert.equal(clampCount(-5, 100), 0);
    assert.equal(clampCount(undefined, 100), 100);
    assert.equal(clampCount(Number.NaN, 100), 100);
    assert.equal(particlePositions(1, 1e9, [1, 1, 1]).length, MAX_PARTICLES * 3);
  });
  test("cintilação e avanço dependem só do quadro", () => {
    assert.equal(flicker(10, 30, 7), flicker(10, 30, 7));
    assert.ok(flicker(10, 30, 7) > 0.5 && flicker(10, 30, 7) < 1.5);
    assert.equal(travel(60, 30, 1), 2 * 4);
  });
  test("timeline: duração mínima de 4 s, câmera estática, texto conta", () => {
    const p = props({ job: { scenes: [{ id: "d", type: "dark3d", env: "vazio" }, { id: "e", type: "dark3d", env: "vazio", title: "Uma frase curta" }] } });
    assert.equal(readingSeconds(p.job.scenes[0], "normal"), 4);
    assert.equal(sceneWords(p.job.scenes[1]), 3);
    const plan = planTimeline(p);
    assert.equal(plan.scenes[0].camera, "static");
    assert.ok(plan.scenes[0].frames >= 4 * 30 - 1);
  });
});
