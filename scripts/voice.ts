// Locução (TTS) por cena, com tempo de cada palavra para as legendas.
//   pnpm video voice <pasta> [--lang pt-BR|all] [--force]
//
// Provedores (job.voice.provider):
//   piper       local e grátis. Baixa a voz do HuggingFace na 1ª vez (.cache/piper). Requer `pip install piper-tts`.
//   elevenlabs  ELEVENLABS_API_KEY (+ ELEVENLABS_VOICE_ID opcional). Melhor qualidade; tempos exatos por palavra.
//   openai      OPENAI_API_KEY. Voz "alloy" por padrão (job.voice.voiceId muda).
//   kokoro      local e grátis, mais natural que o Piper. Requer `pip install kokoro-onnx soundfile`; baixa o
//               modelo (~120 MB) na 1ª vez para .cache/kokoro. pt-BR: pf_dora (padrão), pm_alex, pm_santa.
// Sem tempos exatos, as palavras são distribuídas pela duração da fala (sílabas e pausas).
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import type { CaptionItem, Job, Scene } from "../src/core/schema.ts";
import { die, langId, log, p, python, readJson, run, writeJson } from "./lib/env.ts";
import { applyI18n, loadJob, voiceDir, voiceKey } from "./lib/resolve.ts";
import { fileOf } from "./lib/workspace.ts";

const PIPER_VOICES: Record<string, string> = {
  "pt-br": "pt_BR-faber-medium",
  "pt-pt": "pt_PT-tugão-medium",
  "pt-ao": "pt_PT-tugão-medium",
  en: "en_US-lessac-medium",
  "en-us": "en_US-lessac-medium",
  "en-gb": "en_GB-alan-medium",
  es: "es_ES-davefx-medium",
  fr: "fr_FR-siwis-medium",
  it: "it_IT-paola-medium",
  de: "de_DE-thorsten-medium",
};
const OPENAI_DEFAULT = "alloy";
// Kokoro: voz e código de idioma por língua (pt-PT e pt-AO caem na voz brasileira; para eles o Piper soa mais certo)
const KOKORO: Record<string, [voice: string, lang: string]> = {
  pt: ["pf_dora", "pt-br"], en: ["af_heart", "en-us"], "en-gb": ["bf_emma", "en-gb"], es: ["ef_dora", "es"], fr: ["ff_siwis", "fr-fr"], it: ["if_sara", "it"],
};
const KOKORO_FILES = ["kokoro-v1.0.int8.onnx", "voices-v1.0.bin"];
const KOKORO_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/";
const ELEVEN_DEFAULT = "21m00Tcm4TlvDq8ikWAM"; // Rachel (multilíngue)

/** voiceId pode ser string ou "pt-BR=xxx,en=yyy" */
const voiceFor = (job: Job, lang: string, fallback: string) => {
  const v = job.voice.voiceId;
  if (!v) return fallback;
  if (!v.includes("=")) return v;
  const map = Object.fromEntries(v.split(",").map((kv) => kv.split("=").map((s) => s.trim())));
  return map[lang] ?? map[langId(lang)] ?? map[lang.split("-")[0]] ?? fallback;
};

const seconds = (file: string) => {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
  return Number(r.stdout.trim());
};

/** Normaliza, corta silêncio das pontas e salva mp3 48 kHz. */
const finish = (input: string, out: string) => {
  run("ffmpeg", [
    "-y", "-loglevel", "error", "-i", input,
    "-af", "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11",
    "-ar", "48000", "-ac", "1", "-b:a", "160k", out,
  ], { quiet: true });
  return seconds(out);
};

/** Distribui as palavras pela duração, pesando sílabas e pausas de pontuação. */
const estimateWords = (text: string, dur: number): CaptionItem[] => {
  const words = text.replace(/[[\]]/g, "").split(/\s+/).filter(Boolean);
  const weight = (w: string) => Math.max(1, (w.match(/[aeiouáéíóúâêôãõàyAEIOUÁÉÍÓÚÂÊÔÃÕ]+/g) ?? []).length) + (/[.!?]$/.test(w) ? 1.6 : /[,;:]$/.test(w) ? 0.8 : 0);
  const total = words.reduce((s, w) => s + weight(w), 0);
  let t = 0;
  return words.map((w) => {
    const d = (weight(w) / total) * dur * 1000;
    const c = { text: ` ${w}`, startMs: Math.round(t), endMs: Math.round(t + d * 0.92), timestampMs: Math.round(t + d / 2), confidence: null };
    t += d;
    return c;
  });
};

const piper = async (text: string, lang: string, job: Job, wav: string) => {
  const voice = voiceFor(job, lang, PIPER_VOICES[langId(lang)] ?? PIPER_VOICES[lang.split("-")[0].toLowerCase()] ?? "en_US-lessac-medium");
  const cache = p(".cache", "piper");
  mkdirSync(cache, { recursive: true });
  const model = `${cache}/${voice}.onnx`;
  if (!existsSync(model)) {
    // baixa direto do HuggingFace (o downloader do piper falha com acentos, ex.: "tugão")
    const [loc, name, quality] = voice.split("-");
    const base = `https://huggingface.co/rhasspy/piper-voices/resolve/main/${loc.split("_")[0]}/${loc}/${encodeURIComponent(name)}/${quality}/${encodeURIComponent(voice)}`;
    log(`baixando voz ${voice}…`);
    for (const ext of [".onnx", ".onnx.json"]) {
      const r = await fetch(base + ext);
      if (!r.ok) die(`voz ${voice}: ${r.status} (veja a lista em https://huggingface.co/rhasspy/piper-voices)`);
      writeFileSync(`${cache}/${voice}${ext}`, Buffer.from(await r.arrayBuffer()));
    }
  }
  const txt = `${wav}.txt`;
  writeFileSync(txt, text);
  run(python(), ["-m", "piper", "-m", model, "-i", txt, "-f", wav, "--length-scale", process.env.PIPER_LENGTH ?? "1.0", "--sentence-silence", "0.25"], { quiet: true });
  unlinkSync(txt);
  return null;
};

const kokoro = async (text: string, lang: string, job: Job, wav: string) => {
  const id = langId(lang);
  const [defVoice, kLang] = KOKORO[id] ?? KOKORO[id.split("-")[0]] ?? KOKORO.en;
  if (/^pt-(pt|ao)$/.test(id)) log(`${lang}: o Kokoro só tem português do Brasil; para ${lang} prefira o Piper (pt_PT-tugão)`);
  const cache = p(".cache", "kokoro");
  mkdirSync(cache, { recursive: true });
  for (const f of KOKORO_FILES) {
    if (existsSync(`${cache}/${f}`)) continue;
    log(`baixando ${f} (1ª vez)…`);
    const r = await fetch(KOKORO_URL + f);
    if (!r.ok) die(`Kokoro: download de ${f} falhou (${r.status})`);
    writeFileSync(`${cache}/${f}`, Buffer.from(await r.arrayBuffer()));
  }
  const txt = `${wav}.txt`;
  writeFileSync(txt, text);
  run(python(), [p("scripts", "kokoro_tts.py"), `${cache}/${KOKORO_FILES[0]}`, `${cache}/${KOKORO_FILES[1]}`, voiceFor(job, lang, defVoice), kLang, process.env.KOKORO_SPEED ?? "1.0", txt, wav], { quiet: true });
  unlinkSync(txt);
  return null;
};

const elevenlabs = async (text: string, lang: string, job: Job, out: string): Promise<CaptionItem[] | null> => {
  const key = process.env.ELEVENLABS_API_KEY ?? die("ELEVENLABS_API_KEY não definida no .env");
  const voice = voiceFor(job, lang, process.env.ELEVENLABS_VOICE_ID ?? ELEVEN_DEFAULT);
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2", language_code: lang.split("-")[0], voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.25 } }),
  });
  if (!r.ok) die(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = (await r.json()) as { audio_base64: string; alignment: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] } };
  writeFileSync(out, Buffer.from(j.audio_base64, "base64"));
  // caracteres -> palavras
  const a = j.alignment;
  const words: CaptionItem[] = [];
  let cur = "";
  let s = 0;
  let e = 0;
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) words.push({ text: ` ${cur}`, startMs: s * 1000, endMs: e * 1000, timestampMs: ((s + e) / 2) * 1000, confidence: null });
      cur = "";
      return;
    }
    if (!cur) s = a.character_start_times_seconds[i];
    cur += ch;
    e = a.character_end_times_seconds[i];
  });
  if (cur) words.push({ text: ` ${cur}`, startMs: s * 1000, endMs: e * 1000, timestampMs: ((s + e) / 2) * 1000, confidence: null });
  return words;
};

const openai = async (text: string, lang: string, job: Job, out: string) => {
  const key = process.env.OPENAI_API_KEY ?? die("OPENAI_API_KEY não definida no .env");
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts", voice: voiceFor(job, lang, OPENAI_DEFAULT), input: text, response_format: "mp3" }),
  });
  if (!r.ok) die(`OpenAI ${r.status}: ${(await r.text()).slice(0, 300)}`);
  writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  return null;
};

export const generateVoice = async (slug: string, lang: string, force = false) => {
  const base = loadJob();
  if (base.voice.provider === "none") die(`job sem locução: defina "voice": { "provider": "piper" } (ou kokoro/elevenlabs/openai) no job.json`);
  const { job } = applyI18n(base, lang);
  const dir = voiceDir(slug, lang);
  mkdirSync(dir, { recursive: true });
  const mf = `${dir}/manifest.json`;
  const manifest: Record<string, { key: string; src: string; seconds: number; words: CaptionItem[] }> = existsSync(mf) ? readJson(mf) : {};
  const scenes = job.scenes.filter((s): s is Scene & { voice: string } => !!s.voice);
  if (!scenes.length) log("nenhuma cena com \"voice\" no roteiro");
  for (const s of scenes) {
    const key = voiceKey(job, s);
    const rel = `${slug}/voice/${langId(lang)}/${s.id}.mp3`;
    if (!force && manifest[s.id]?.key === key && existsSync(fileOf(rel))) continue;
    const text = s.voice.replace(/[[\]]/g, "");
    const raw = `${dir}/${s.id}.raw`;
    let words: CaptionItem[] | null = null;
    if (job.voice.provider === "piper") words = await piper(text, lang, job, raw + ".wav");
    if (job.voice.provider === "elevenlabs") words = await elevenlabs(text, lang, job, raw + ".wav");
    if (job.voice.provider === "openai") words = await openai(text, lang, job, raw + ".wav");
    if (job.voice.provider === "kokoro") words = await kokoro(text, lang, job, raw + ".wav");
    const sec = job.voice.provider === "elevenlabs" ? (run("ffmpeg", ["-y", "-loglevel", "error", "-i", raw + ".wav", "-af", "loudnorm=I=-16:TP=-1.5", "-ar", "48000", "-ac", "1", "-b:a", "160k", fileOf(rel)], { quiet: true }), seconds(fileOf(rel))) : finish(raw + ".wav", fileOf(rel));
    unlinkSync(raw + ".wav");
    manifest[s.id] = { key, src: rel, seconds: sec, words: words ?? estimateWords(text, sec) };
    log(`${lang} ${s.id}: ${sec.toFixed(2)} s`);
    writeJson(mf, manifest);
  }
  writeJson(mf, manifest);
  void readFileSync;
};
