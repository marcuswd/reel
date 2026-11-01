import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseBlack, parseFrozen, parseLufs, parseSilence, parseYmax, review, samplePoints } from "./qc.ts";

// trechos reais da saída do ffmpeg
const black = "[blackdetect @ 0x1] black_start:0 black_end:0.2 black_duration:0.2\n[blackdetect @ 0x1] black_start:5.4 black_end:6.1 black_duration:0.7";
const freeze = "[freezedetect @ 0x2] lavfi.freezedetect.freeze_start: 8.033\n[freezedetect @ 0x2] lavfi.freezedetect.freeze_duration: 3.5\n[freezedetect @ 0x2] lavfi.freezedetect.freeze_end: 11.533";
const silence = "[silencedetect @ 0x3] silence_start: 2\n[silencedetect @ 0x3] silence_end: 4.5 | silence_duration: 2.5\n[silencedetect @ 0x3] silence_start: 19.2";
const ebu = "[Parsed_ebur128_1] t: 1 TARGET:-23 LUFS M: -20 S: -21 I: -19.0 LUFS\n  Integrated loudness:\n    I:         -14.6 LUFS";

describe("QC: leitura do ffmpeg", () => {
  test("trechos de preto, parado e silêncio; loudness do resumo", () => {
    assert.deepEqual(parseBlack(black), [{ start: 0, end: 0.2 }, { start: 5.4, end: 6.1 }]);
    assert.deepEqual(parseFrozen(freeze), [{ start: 8.033, end: 11.533 }]);
    assert.deepEqual(parseSilence(silence), [{ start: 2, end: 4.5 }, { start: 19.2, end: Infinity }]);
    assert.equal(parseLufs(ebu), -14.6);
    assert.equal(parseLufs("sem áudio"), undefined);
  });
  test("revisão: preto no meio é problema; preto do início não", () => {
    const ok = { duration: 20, width: 1920, height: 1080, audio: true };
    const r = review({ probe: ok, expect: { ...ok, continuous: true }, black: parseBlack(black), frozen: parseFrozen(freeze), silent: parseSilence(silence), lufs: -14.6 });
    assert.deepEqual(r.problems, ["tela preta de 5.4 s a 6.1 s"]);
    assert.deepEqual(r.warnings, ["imagem parada de 8.0 s a 11.5 s (3.5 s)", "silêncio de 2.0 s a 4.5 s"]);
  });
  test("resolução, duração, áudio e loudness fora do alvo", () => {
    const r = review({ probe: { duration: 18, width: 960, height: 540, audio: false }, expect: { duration: 20, width: 1920, height: 1080, audio: true }, black: [], frozen: [], silent: [], lufs: -20 });
    assert.equal(r.problems.length, 3);
    const l = review({ probe: { duration: 20, width: 1, height: 1, audio: true }, expect: { duration: 20, width: 1, height: 1, audio: true, continuous: true }, black: [], frozen: [], silent: [], lufs: -20 });
    assert.deepEqual(l.warnings, ["loudness -20 LUFS (alvo -14 a -16)"]);
  });
  test("só efeitos sonoros: silêncio entre eles não é aviso", () => {
    const a = { duration: 20, width: 1, height: 1, audio: true };
    assert.deepEqual(review({ probe: a, expect: a, black: [], frozen: [], silent: parseSilence(silence), lufs: -22 }).warnings, []);
  });
  test("quatro pontos de amostra", () => assert.deepEqual(samplePoints(10), [1, 3.7, 6.3, 9]));
  test("fundo escuro com texto não é tela preta, só aviso", () => {
    const a = { duration: 80, width: 1, height: 1, audio: false };
    const dark = review({ probe: a, expect: a, black: [{ start: 59.1, end: 59.5, ymax: 235 }], frozen: [], silent: [] });
    assert.deepEqual(dark.problems, []);
    assert.deepEqual(dark.warnings, ["quadro escuro e quase vazio de 59.1 s a 59.5 s"]);
    const black = review({ probe: a, expect: a, black: [{ start: 30, end: 31, ymax: 18 }], frozen: [], silent: [] });
    assert.deepEqual(black.problems, ["tela preta de 30.0 s a 31.0 s"]);
  });
  test("lê o YMAX do signalstats", () => {
    assert.equal(parseYmax("[Parsed_metadata_1] frame:0 pts:0\nlavfi.signalstats.YMIN=16\nlavfi.signalstats.YMAX=235\n"), 235);
    assert.equal(parseYmax("nada"), undefined);
  });
});
