// Transcrição local (Whisper.cpp) de vídeo/áudio falado -> legendas com tempo por palavra.
//   pnpm transcribe public/<slug>/clips/entrevista.mp4 [--lang pt] [--model base|small|medium|large-v3-turbo] [--out arquivo.json]
//
// Saída: JSON de legendas (formato Caption do @remotion/captions) ao lado do arquivo
// (entrevista.captions.json) + .srt. Use no job: { "type": "media", "media": { "src": "...", "muted": false,
// "captions": "<slug>/clips/entrevista.captions.json" } }. Para outro idioma, traduza o .srt
// e rode `pnpm transcribe --srt arquivo-en.srt` para converter em JSON (captions com {lang}).
// Na 1ª vez instala o whisper.cpp e baixa o modelo em .cache/whisper (Windows: binário pronto; Linux/Mac: compila).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import type { CaptionItem } from "../src/core/schema.ts";
import { toSrt } from "../src/core/srt.ts";
import { die, log, p, parseArgs, run } from "./lib/env.ts";

const { pos, opt } = parseArgs(process.argv.slice(2));
const s = (k: string) => (typeof opt[k] === "string" ? (opt[k] as string) : undefined);

const fromSrt = async (file: string) => {
  const { parseSrt } = await import("@remotion/captions");
  const { captions } = parseSrt({ input: readFileSync(file, "utf8") });
  // divide cada bloco em palavras com tempo proporcional (para o destaque palavra a palavra)
  const out: CaptionItem[] = [];
  for (const c of captions) {
    const words = c.text.trim().split(/\s+/);
    const total = words.reduce((n, w) => n + w.length + 1, 0);
    let t = c.startMs;
    for (const w of words) {
      const d = ((w.length + 1) / total) * (c.endMs - c.startMs);
      out.push({ text: ` ${w}`, startMs: Math.round(t), endMs: Math.round(t + d), timestampMs: Math.round(t + d / 2), confidence: null });
      t += d;
    }
  }
  const dest = s("out") ?? file.replace(/\.srt$/i, ".captions.json");
  writeFileSync(dest, JSON.stringify(out, null, 2));
  log(`${out.length} palavras → ${dest}`);
};

const main = async () => {
  if (s("srt")) return fromSrt(s("srt")!);
  const input = pos[0] ?? die("arquivo de áudio/vídeo?");
  if (!existsSync(input)) die(`não existe: ${input}`);
  const lang = s("lang") ?? "pt";
  const model = (s("model") ?? "small") as "base" | "small" | "medium" | "large-v3-turbo";
  const { installWhisperCpp, downloadWhisperModel, transcribe, toCaptions } = await import("@remotion/install-whisper-cpp");
  const dir = p(".cache", "whisper");
  mkdirSync(dir, { recursive: true });
  const version = "1.7.6";
  const bin = join(dir, `whisper.cpp-${version}`); // a pasta não pode existir antes da instalação
  await installWhisperCpp({ to: bin, version, printOutput: !!opt.verbose });
  await downloadWhisperModel({ model, folder: dir, printOutput: false });
  const wav = join(dir, `${basename(input, extname(input))}.16k.wav`);
  run("ffmpeg", ["-y", "-loglevel", "error", "-i", input, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav], { quiet: true });
  log(`transcrevendo (${model}, ${lang})…`);
  const out = await transcribe({ inputPath: wav, whisperPath: bin, whisperCppVersion: version, model, modelFolder: dir, tokenLevelTimestamps: true, language: lang as "pt", splitOnWord: true, printOutput: false });
  const { captions } = toCaptions({ whisperCppOutput: out });
  const dest = s("out") ?? join(dirname(input), `${basename(input, extname(input))}.captions.json`);
  writeFileSync(dest, JSON.stringify(captions, null, 2));
  writeFileSync(dest.replace(/\.json$/, ".srt"), toSrt(captions as CaptionItem[]));
  log(`${captions.length} palavras → ${dest} (+ .srt)`);
};
main().catch((e) => { console.error(e); process.exit(1); });
