import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { AA, CAPTION_PLATE, contrast, inkOn, over } from "./color";

describe("contraste", () => {
  test("valores de referência do WCAG", () => {
    assert.equal(contrast("#000", "#fff"), 21);
    assert.equal(contrast("#777", "#777"), 1);
    assert.ok(Math.abs(contrast("#767676", "#ffffff") - 4.54) < 0.01);
  });
  test("placa da legenda: branco passa no AA sobre qualquer fundo", () => {
    for (const fundo of ["#ffffff", "#ffff00", "#808080", "#000000"]) {
      assert.ok(contrast("#ffffff", over("#000000", CAPTION_PLATE, fundo)) >= AA, fundo);
    }
  });
  test("texto da palavra ativa passa no AA sobre qualquer cor de destaque", () => {
    for (let r = 0; r < 256; r += 51) for (let g = 0; g < 256; g += 51) for (let b = 0; b < 256; b += 51) {
      const h = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
      assert.ok(contrast(inkOn(h), h) >= AA, h);
    }
  });
  test("inkOn escolhe preto em cor clara e branco em cor escura", () => {
    assert.equal(inkOn("#f97316"), "#000000");
    assert.equal(inkOn("#1d4ed8"), "#ffffff");
  });
});
