import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { toSrt, toVtt } from "./srt";
import { words } from "./testing";

describe("srt", () => {
  test("formato de tempo com horas e milissegundos", () => {
    const srt = toSrt([{ text: "oi", startMs: 3_723_004.6, endMs: 3_724_000, timestampMs: null, confidence: null }]);
    assert.equal(srt, "1\n01:02:03,005 --> 01:02:04,000\noi\n");
  });
  test("quebra no fim da frase, no limite de caracteres e em pausa longa", () => {
    const ws = [...words("Primeira frase.", 0), ...words("segunda parte", 600), ...words("depois da pausa", 3000)];
    const blocos = toSrt(ws).split("\n\n").map((b) => b.split("\n")[2]);
    assert.deepEqual(blocos, ["Primeira frase.", "segunda parte", "depois da pausa"]);
    const longas = toSrt(words("palavra ".repeat(12).trim()), 20).split("\n\n");
    assert.ok(longas.every((b) => b.split("\n")[2].length <= 20));
  });
  test("ignora palavras vazias e lista vazia vira texto vazio", () => {
    assert.equal(toSrt([]), "");
    assert.equal(toSrt([{ text: "  ", startMs: 0, endMs: 1, timestampMs: null, confidence: null }]), "");
  });
  test("vtt: cabeçalho, ponto nos milissegundos e sem numeração", () => {
    const vtt = toVtt(words("olá mundo", 1000));
    assert.equal(vtt, "WEBVTT\n\n00:00:01.000 --> 00:00:01.550\nolá mundo\n");
  });
});
