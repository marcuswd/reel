// Ponta a ponta: uma pasta de cliente temporária vira vídeo, sem gravar nada no repositório.
// Lento (abre o Chromium): só roda com REEL_E2E=1 (o CI liga).
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { after, describe, test } from "node:test";
import { p } from "./lib/env.ts";

const tsx = (args: string[]) => {
  const r = spawnSync(process.execPath, ["--import", "tsx", p("scripts", "video.ts"), ...args], { cwd: p(), encoding: "utf8" });
  assert.equal(r.status, 0, `${args.join(" ")}\n${r.stdout}\n${r.stderr}`);
  return r.stdout;
};
const repoState = () => ["public", "jobs", "brands", "out", "clientes"].map((d) => `${d}:${existsSync(p(d)) ? readdirSync(p(d)).sort().join(",") : "-"}`).join(" ");

describe("pasta do cliente → vídeo", { skip: process.env.REEL_E2E !== "1" && "defina REEL_E2E=1" }, () => {
  const videos = mkdtempSync(join(tmpdir(), "reel e2e "));
  after(() => rmSync(videos, { recursive: true, force: true }));
  const promo = join(videos, "promo");
  const before = repoState();

  test("new, stills e render --draft", () => {
    writeFileSync(join(videos, "brand.json"), JSON.stringify({
      slug: "cliente", name: "Cliente",
      colors: { bg: "#101418", bg2: "#1d2733", surface: "#ffffff", text: "#ffffff", textOnSurface: "#101418", muted: "#a8b3c2", primary: "#2563eb", accent: "#f59e0b", highlight: "#f59e0b", palette: ["#2563eb", "#f59e0b"] },
      fonts: { heading: { family: "Inter" }, body: { family: "Inter" } },
    }));
    mkdirSync(promo);
    tsx(["new", promo, "--brand", "cliente", "--format", "9:16"]);
    const job = JSON.parse(readFileSync(join(promo, "job.json"), "utf8"));
    job.music = { mode: "none" }; // sem python no teste
    job.scenes = job.scenes.slice(0, 2);
    writeFileSync(join(promo, "job.json"), JSON.stringify(job));

    assert.match(tsx(["check", promo]), /0 erro\(s\)/);
    tsx(["stills", promo]);
    assert.ok(existsSync(join(promo, "out", "sheet-9x16-pt-br.jpg")), "folha de contato");
    assert.equal(readdirSync(join(promo, "out", "stills")).length, 2);

    tsx(["render", promo, "--draft"]);
    const [day] = readdirSync(join(promo, "entregas"));
    assert.ok(readdirSync(join(promo, "entregas", day)).includes("promo-9x16-pt-br.mp4"));

    assert.equal(repoState(), before, "nada do cliente no repositório");
  });
});
