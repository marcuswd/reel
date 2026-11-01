import assert from "node:assert/strict";
import { test } from "node:test";
import { applyFilter, parseLoudnorm, withinTarget } from "./loudness.ts";

const out = `[Parsed_loudnorm_0 @ 0x1]
{
	"input_i" : "-18.94",
	"input_tp" : "-0.91",
	"input_lra" : "11.60",
	"input_thresh" : "-29.18",
	"output_i" : "-15.14",
	"output_tp" : "-1.50",
	"output_lra" : "7.90",
	"output_thresh" : "-25.21",
	"normalization_type" : "dynamic",
	"target_offset" : "1.14"
}`;

test("loudnorm: lê a medição e monta a 2ª passada", () => {
  const m = parseLoudnorm(out);
  assert.ok(m);
  assert.equal(m!.input_i, "-18.94");
  assert.match(applyFilter(m!), /measured_I=-18.94:measured_TP=-0.91:measured_LRA=11.60:measured_thresh=-29.18:offset=1.14:linear=true/);
  assert.equal(withinTarget(m!), false);
});

test("loudnorm: sem bloco ou com -inf (silêncio) não normaliza", () => {
  assert.equal(parseLoudnorm("nada aqui"), null);
  assert.equal(parseLoudnorm(out.replace('"-18.94"', '"-inf"')), null);
});

test("loudnorm: dentro da faixa fica como está", () => {
  assert.equal(withinTarget({ input_i: "-15.2", input_tp: "-2.0", input_lra: "8", input_thresh: "-25", target_offset: "0" }), true);
});
