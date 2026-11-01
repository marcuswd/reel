// Diagnóstico do ambiente: ferramentas, chaves (só se existem, nunca o valor) e rede.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { browserExecutable, has, p, python } from "./lib/env.ts";

const ok = (b: boolean) => (b ? "✓" : "✗");

export const doctor = async () => {
  console.log("Ferramentas");
  console.log(`  ${ok(has("ffmpeg"))} ffmpeg / ${ok(has("ffprobe"))} ffprobe`);
  const py = python();
  const deps = spawnSync(py, ["-c", "import numpy, scipy; print('ok')"], { encoding: "utf8" });
  console.log(`  ${ok(deps.stdout?.includes("ok"))} ${py} + numpy + scipy (trilha e efeitos gerados)  → pip install numpy scipy`);
  const piper = spawnSync(py, ["-c", "import piper; print('ok')"], { encoding: "utf8" });
  console.log(`  ${ok(piper.stdout?.includes("ok"))} piper-tts (locução local)  → pip install piper-tts`);
  console.log(`  ${ok(existsSync(p("public", "_lib", "sfx", "whoosh.mp3")))} pack de efeitos (public/_lib/sfx)  → pnpm sfx`);
  const b = browserExecutable();
  console.log(`  ✓ navegador de render: ${b ?? "Chrome Headless Shell do Remotion (baixa sozinho)"}`);

  console.log("\nChaves no .env (só presença)");
  const keys: [string, string][] = [
    ["PIXABAY_API_KEY", "fotos e vídeos (Pixabay)"],
    ["UNSPLASH_ACCESS_KEY", "fotos (Unsplash)"],
    ["PEXELS_API_KEY", "fotos e vídeos (Pexels)"],
    ["FREESOUND_TOKEN", "efeitos sonoros (Freesound)"],
    ["JAMENDO_CLIENT_ID", "trilhas (Jamendo)"],
    ["ELEVENLABS_API_KEY", "locução premium (ElevenLabs)"],
    ["OPENAI_API_KEY", "locução/tradução (OpenAI)"],
    ["DEEPL_API_KEY", "tradução (DeepL)"],
    ["ANTHROPIC_API_KEY", "tradução (Claude)"],
  ];
  for (const [k, d] of keys) console.log(`  ${ok(!!process.env[k])} ${k.padEnd(20)} ${d}`);

  console.log("\nRede");
  const hosts = ["https://pixabay.com", "https://api.unsplash.com", "https://api.pexels.com", "https://api.openverse.org", "https://freesound.org", "https://api.jamendo.com", "https://api.elevenlabs.io", "https://huggingface.co", "https://fonts.googleapis.com", "https://registry.npmjs.org"];
  await Promise.all(
    hosts.map(async (h) => {
      try {
        const r = await fetch(h, { method: "HEAD", signal: AbortSignal.timeout(8000) });
        console.log(`  ✓ ${h} (${r.status})`);
      } catch {
        console.log(`  ✗ ${h} (bloqueado ou fora do ar)`);
      }
    }),
  );
};
