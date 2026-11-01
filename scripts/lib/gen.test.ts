import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { after, describe, test } from "node:test";
import { p } from "./env.ts";
import { MODEL, buildPrompt, genImage, genRequest, variantNames } from "./gen.ts";

describe("imagem por IA: partes puras", () => {
  test("prompt leva a paleta da marca e proíbe pessoas e texto", () => {
    const pr = buildPrompt("Fundo abstrato de ondas.", { brand: { colors: { primary: "#22c55e", accent: "#facc15", palette: ["#22c55e", "#0ea5e9"] } }, style: "3d render" });
    assert.match(pr, /^Fundo abstrato de ondas\. 3d render\. color palette #22c55e, #facc15, #0ea5e9\./);
    assert.match(pr, /no people, no humans, no faces/);
    assert.match(pr, /no text/);
  });
  test("requisição: modelo, token, passos limitados e seed", () => {
    const { url, init } = genRequest("acc", "tok", "x", { steps: 20, seed: 7 });
    assert.equal(url, `https://api.cloudflare.com/client/v4/accounts/acc/ai/run/${MODEL}`);
    assert.equal((init.headers as Record<string, string>).Authorization, "Bearer tok");
    assert.deepEqual(JSON.parse(init.body), { prompt: "x", steps: 8, seed: 7 });
  });
  test("resposta: imagem base64 ou erro com a mensagem", () => {
    assert.deepEqual(genImage({ result: { image: Buffer.from("jpg").toString("base64") } }), Buffer.from("jpg"));
    assert.throws(() => genImage({ success: false, errors: [{ message: "cota diária esgotada" }] }), /cota diária esgotada/);
  });
  test("nomes das variações", () => {
    assert.deepEqual(variantNames("a/fundo.jpg", 1), ["a/fundo.jpg"]);
    assert.deepEqual(variantNames("a/fundo.jpg", 2), ["a/fundo-1.jpg", "a/fundo-2.jpg"]);
  });
});

describe("imagem por IA: comando completo contra uma API falsa", () => {
  const dir = mkdtempSync(join(tmpdir(), "reel gen "));
  const prompts: string[] = [];
  // JPEG mínimo de verdade (1x1) para o ffmpeg montar a folha das opções
  const jpg = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      prompts.push(JSON.parse(body).prompt);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, result: { image: jpg.toString("base64") } }));
    });
  });
  after(() => { server.close(); rmSync(dir, { recursive: true, force: true }); });

  test("gera as variações na pasta do job com a paleta do brand.json de cima e registra o crédito", async () => {
    await new Promise<void>((r) => server.listen(0, r));
    const port = (server.address() as { port: number }).port;
    writeFileSync(join(dir, "brand.json"), JSON.stringify({ colors: { primary: "#123456" } }));
    mkdirSync(join(dir, "promo"));
    const code = await new Promise<number>((resolve) => {
      const c = spawn(process.execPath, ["--import", "tsx", p("scripts", "media.ts"), "gen", "--prompt", "fundo de ondas", "--out", join(dir, "promo", "img", "fundo.jpg"), "--variants", "2"], {
        cwd: p(), env: { ...process.env, CF_ACCOUNT_ID: "a", CF_API_TOKEN: "t", CF_API_BASE: `http://127.0.0.1:${port}` }, stdio: "ignore",
      });
      c.on("close", (n) => resolve(n ?? 1));
    });
    assert.equal(code, 0);
    assert.ok(existsSync(join(dir, "promo", "img", "fundo-1.jpg")) && existsSync(join(dir, "promo", "img", "fundo-2.jpg")));
    assert.equal(prompts.length, 2);
    assert.match(prompts[0], /#123456/);
    assert.match(readFileSync(join(dir, "promo", "img", "CREDITS.md"), "utf8"), /FLUX\.1 schnell/);
  });
});
