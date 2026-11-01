import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { LOOKS, cube, grade, lutFilter } from "./lut.ts";

describe("looks de cor", () => {
  test(".cube com o tamanho certo e valores entre 0 e 1", () => {
    for (const look of LOOKS) {
      const lines = cube(look, 5).trim().split("\n");
      assert.equal(lines[1], "LUT_3D_SIZE 5");
      const values = lines.slice(2).flatMap((l) => l.split(" ").map(Number));
      assert.equal(values.length, 5 ** 3 * 3);
      assert.ok(values.every((v) => v >= 0 && v <= 1), look);
    }
  });
  test("cada look puxa para o lado certo", () => {
    const mid: [number, number, number] = [0.5, 0.5, 0.5];
    const [wr, , wb] = grade("warm", mid);
    assert.ok(wr > wb);
    const [cr, , cb] = grade("cool", mid);
    assert.ok(cb > cr);
    const [m1, m2, m3] = grade("mono", [0.8, 0.2, 0.4]);
    assert.ok(m1 === m2 && m2 === m3);
    assert.ok(grade("film", [0, 0, 0])[0] > 0.03, "film levanta os pretos");
  });
  test("caminho do Windows escapado para o filtro do ffmpeg", () => {
    assert.equal(lutFilter("C:\\sites\\x\\out\\look-warm.cube"), "lut3d=file='C\\:/sites/x/out/look-warm.cube':interp=tetrahedral");
  });
});
