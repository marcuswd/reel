import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { after, describe, test } from "node:test";
import { has, run, spawnPlan } from "./env.ts";
import { sheetArgs } from "./sheet.ts";

describe("spawnPlan", () => {
  test("ffmpeg no Windows vai sem shell e com os argumentos intactos", () => {
    const args = ["-filter_complex", "[0:v][1:v]xstack=inputs=2:layout=0_0|480_0", "C:\\pasta com espaço\\a.jpg"];
    assert.deepEqual(spawnPlan("ffmpeg", args, "win32"), { cmd: "ffmpeg", args, shell: false });
  });
  test(".cmd no Windows vai pelo shell com aspas onde precisa", () => {
    const s = spawnPlan("npm.cmd", ["pack", "@fontsource/inter", "--pack-destination", "C:\\a b"], "win32");
    assert.equal(s.shell, true);
    assert.deepEqual(s.args, ["pack", "@fontsource/inter", "--pack-destination", '"C:\\a b"']);
  });
  test("fora do Windows nunca usa shell", () => {
    assert.equal(spawnPlan("npm.cmd", [], "linux").shell, false);
  });
});

describe("sheetArgs", () => {
  test("posiciona por pixel, linha incompleta preenchida", () => {
    const a = sheetArgs(["1", "2", "3", "4"], "o.jpg", { w: 480, h: 270, cols: 3 });
    const g = a[a.indexOf("-filter_complex") + 1];
    assert.match(g, /xstack=inputs=4:layout=0_0\|480_0\|960_0\|0_270:fill=black$/);
  });
  test("uma imagem não usa xstack (exige 2 entradas)", () => {
    const a = sheetArgs(["1"], "o.jpg", { w: 480, h: 270, cols: 3 });
    assert.doesNotMatch(a.join(" "), /xstack/);
  });
  test("sem imagens falha com mensagem clara", () => {
    assert.throws(() => sheetArgs([], "o.jpg", { w: 1, h: 1, cols: 1 }), /sem imagens/);
  });
});

// Roda o ffmpeg de verdade (pasta com espaço, como em C:\Users\...): é o comando que falhava.
describe("folha com ffmpeg", { skip: !has("ffmpeg") && "ffmpeg ausente" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "reel sheet "));
  after(() => rmSync(dir, { recursive: true, force: true }));
  const stills = (n: number, size: string) =>
    Array.from({ length: n }, (_, i) => {
      const f = join(dir, `${size}-${String(i + 1).padStart(2, "0")}.jpg`);
      run("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", `color=c=0x${(i * 37 % 255).toString(16).padStart(2, "0")}3060:s=${size}`, "-frames:v", "1", f], { quiet: true });
      return f;
    });
  const dims = (f: string) => spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0", f], { encoding: "utf8" }).stdout.trim();

  for (const [n, size, w, h, cols, expect] of [
    [15, "960x540", 480, 270, 3, "1440,1350"], // cms-tis-comercial: 15 cenas 16:9
    [7, "540x960", 270, 480, 6, "1620,960"], // 9:16 com linha incompleta
    [1, "960x540", 480, 270, 3, "480,270"], // job de uma cena
  ] as const) {
    test(`${n} quadro(s) ${size} → ${expect}`, () => {
      const out = join(dir, `sheet-${n}-${size}.jpg`);
      run("ffmpeg", sheetArgs(stills(n, size), out, { w, h, cols }), { quiet: true });
      assert.equal(dims(out), expect);
    });
  }
});
