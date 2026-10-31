import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { paginate } from "./captions";
import { words } from "./testing";

const texts = (ps: ReturnType<typeof paginate>) => ps.map((p) => p.words.map((w) => w.text.trim()).join(" "));

describe("páginas de legenda", () => {
  test("a última palavra da frase não fica sozinha", () => {
    // "onze tipos de cena" + "original." passa de 22 caracteres: sem a regra, "original." ficaria sozinha
    assert.deepEqual(texts(paginate(words("onze tipos de cena original.", 0, 200), 1100, 22)), ["onze tipos de cena original."]);
  });
  test("caso real do demo-30s em 9:16", () => {
    assert.deepEqual(texts(paginate(words("transições e trilha original.", 0, 200), 1100, 22)), ["transições e trilha original."]);
  });
  test("quebra no fim da frase continua valendo", () => {
    assert.deepEqual(texts(paginate(words("Uma frase. Outra frase."), 5000, 40)), ["Uma frase.", "Outra frase."]);
  });
  test("página longa demais não absorve a palavra", () => {
    const ps = texts(paginate(words("palavras bastante compridas aqui sozinha"), 9000, 20));
    assert.ok(ps.every((p) => p.length <= 28), ps.join(" | "));
  });
});
