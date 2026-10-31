import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
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
  test("texto da palavra ativa passa no AA sobre a cor de destaque de todas as marcas", () => {
    const root = resolve(import.meta.dirname, "..", "..", "brands");
    for (const f of readdirSync(root).filter((f) => f.endsWith(".json"))) {
      const h = JSON.parse(readFileSync(join(root, f), "utf8").replace(/^﻿/, "")).colors.highlight as string;
      assert.ok(contrast(inkOn(h), h) >= AA, `${f}: ${h}`);
    }
  });
  test("inkOn escolhe preto em cor clara e branco em cor escura", () => {
    assert.equal(inkOn("#f97316"), "#000000");
    assert.equal(inkOn("#1d4ed8"), "#ffffff");
  });
});
