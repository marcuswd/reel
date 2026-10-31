#!/usr/bin/env tsx
// CLI do gerador de vídeos.  pnpm video <comando> [...]
//
//   new <slug> --brand <marca> [--client <pasta>] [--format 9:16,16:9] [--lang pt-BR]
//   build [slug]                       valida, aplica idiomas/locução, gera trilha e atualiza o Studio
//   voice <slug> [--lang x] [--force]  gera a locução (TTS) das cenas com "voice"
//   music <slug> [--lang x] [--force]  (re)gera a trilha sincronizada aos cortes
//   translate <slug> --to en [--auto]  cria/completa jobs/<slug>/i18n/<lang>.json
//   stills <slug> [--lang x] [--format 9:16]   um quadro por cena em out/<slug>/stills (conferência)
//   render <slug> [--lang x|all] [--format x|all] [--draft] [--dest pasta]
//   plan <slug> [--lang x]             mostra a timeline (cenas, durações, transições, efeitos)
//   doctor                             confere ffmpeg, python, chaves e rede
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { FORMATS, type FormatKey, type VideoProps } from "../src/core/schema.ts";
import { musicBrief } from "../src/core/timeline.ts";
import { toSrt, toVtt } from "../src/core/srt.ts";
import { browserExecutable, die, fmtId, has, hash, langId, log, p, parseArgs, python, readJson, run, today, writeJson } from "./lib/env.ts";
import { sheetArgs } from "./lib/sheet.ts";
import { extractStrings, langsOf, listJobs, loadBrand, loadJob, musicFile, planOf, resolveProps, writeIndex, writeResolved } from "./lib/resolve.ts";

const [cmd, ...rest] = process.argv.slice(2);
const { pos, opt } = parseArgs(rest);
const str = (k: string) => (typeof opt[k] === "string" ? (opt[k] as string) : undefined);

const pickLangs = (slug: string) => {
  const job = loadJob(slug);
  const l = str("lang");
  return !l ? [job.lang] : l === "all" ? langsOf(job) : l.split(",");
};
const pickFormats = (slug: string): FormatKey[] => {
  const job = loadJob(slug);
  const f = str("format");
  return !f ? [job.formats[0]] : f === "all" ? job.formats : (f.split(",") as FormatKey[]);
};

// ── trilha gerada ──
const ensureMusic = (props: VideoProps, force = false) => {
  const { job } = props;
  if (job.music.mode !== "generate") return props;
  const plan = planOf(props);
  const brief = musicBrief(props, plan);
  const rel = musicFile(job.slug, props.langCode);
  const out = p("public", rel);
  const stamp = `${out}.json`;
  const h = hash(brief);
  if (!force && existsSync(out) && existsSync(stamp) && readJson<{ hash: string }>(stamp).hash === h) return { ...props, musicSrc: rel };
  const briefFile = p("jobs", job.slug, "_build", `music-${langId(props.langCode)}.json`);
  writeJson(briefFile, brief);
  log(`trilha (${brief.mood}, ${brief.bpm} BPM, ${(brief.totalFrames / brief.fps).toFixed(1)} s)`);
  run(python(), [p("scripts", "music.py"), briefFile, out]);
  writeJson(stamp, { hash: h });
  return { ...props, musicSrc: rel };
};

/** JSON Schema do job e da marca (autocomplete e validação no VS Code). */
const writeSchemas = async () => {
  const { z } = await import("zod");
  const { jobSchema, brandSchema } = await import("../src/core/schema.ts");
  writeJson(p("schemas", "job.schema.json"), z.toJSONSchema(jobSchema, { io: "input", unrepresentable: "any" }));
  writeJson(p("schemas", "brand.schema.json"), z.toJSONSchema(brandSchema, { io: "input", unrepresentable: "any" }));
};

const build = (slug: string, opts: { music?: boolean } = {}) => {
  const job = loadJob(slug);
  loadBrand(job.brand);
  const all: Record<string, VideoProps> = {};
  for (const lang of langsOf(job)) {
    let { props, missing } = resolveProps(slug, lang);
    if (missing.length && lang !== job.lang) log(`${lang}: ${missing.length} texto(s) sem tradução (usando o original): ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? "…" : ""}`);
    const withVoice = job.scenes.filter((s) => s.voice).length;
    if (job.voice.provider !== "none" && withVoice && Object.keys(props.voice).length < withVoice) log(`${lang}: locução faltando em ${withVoice - Object.keys(props.voice).length} cena(s). Rode: pnpm video voice ${slug} --lang ${lang}`);
    if (opts.music !== false) props = ensureMusic(props, opt.force === true);
    writeResolved(slug, lang, props);
    all[lang] = props;
  }
  const n = writeIndex();
  log(`build ok: ${slug} (${Object.keys(all).join(", ")}) · ${n} composição(ões) no Studio`);
  return all;
};

// ── render ──
const bundleOnce = (() => {
  let url: Promise<string> | null = null;
  return () => {
    if (!url) {
      url = (async () => {
        const { bundle } = await import("@remotion/bundler");
        log("empacotando o projeto…");
        return bundle({ entryPoint: p("src", "index.ts"), publicDir: p("public") });
      })();
    }
    return url;
  };
})();

const free = (f: string) => {
  if (!existsSync(f)) return f;
  const ext = extname(f);
  const b = f.slice(0, -ext.length);
  for (let i = 2; ; i++) if (!existsSync(`${b}-v${i}${ext}`)) return `${b}-v${i}${ext}`;
};

const outDir = (props: VideoProps) => {
  const root = str("dest") ?? process.env.EXPORT_DIR ?? p("clientes");
  return resolve(root, props.job.client ?? props.job.slug, props.job.slug, today());
};

const renderOne = async (props: VideoProps, format: FormatKey) => {
  const { renderMedia, renderStill, selectComposition } = await import("@remotion/renderer");
  const serveUrl = await bundleOnce();
  const inputProps = { ...props, format } as unknown as Record<string, unknown>;
  const browser = browserExecutable();
  const composition = await selectComposition({ serveUrl, id: "Video", inputProps, browserExecutable: browser ?? undefined, logLevel: "error" });
  const plan = planOf({ ...props, format });
  const name = `${props.job.slug}-${fmtId(format)}-${langId(props.langCode)}`;
  const tmp = p("out", `${name}.mp4`);
  mkdirSync(p("out"), { recursive: true });
  const draft = opt.draft === true;
  log(`render ${name} · ${composition.width}x${composition.height} · ${(composition.durationInFrames / composition.fps).toFixed(1)} s${draft ? " (rascunho)" : ""}`);
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: tmp,
    inputProps,
    browserExecutable: browser ?? undefined,
    crf: draft ? 30 : 18,
    scale: draft ? 0.5 : 1,
    concurrency: str("concurrency") ? Number(str("concurrency")) : null,
    chromiumOptions: { gl: "angle" },
    logLevel: "error",
    onProgress: ({ progress }) => {
      const pc = Math.floor(progress * 10);
      if (pc !== last) { last = pc; process.stdout.write(`  ${pc * 10}%`); }
    },
  });
  process.stdout.write("\n");
  // thumbnail: quadro da capa já assentada
  const first = plan.scenes[0];
  const thumbFrame = Math.min(composition.durationInFrames - 1, first.land + Math.round(first.frames * 0.55));
  const thumb = p("out", `${name}-thumb.png`);
  await renderStill({ composition, serveUrl, output: thumb, frame: thumbFrame, inputProps, browserExecutable: browser ?? undefined, imageFormat: "png", logLevel: "error" });

  // exporta
  const dir = outDir(props);
  mkdirSync(dir, { recursive: true });
  const mp4 = free(join(dir, `${name}.mp4`));
  copyFileSync(tmp, mp4);
  copyFileSync(thumb, free(join(dir, `${name}-thumb.png`)));
  const mode = props.job.captions.mode;
  if (plan.captions.length && (mode === "file" || mode === "both")) {
    writeFileSync(free(join(dir, `${name}.srt`)), toSrt(plan.captions));
    writeFileSync(free(join(dir, `${name}.vtt`)), toVtt(plan.captions));
  }
  // créditos (áudio e mídia de terceiros)
  const credits: string[] = [];
  for (const f of [p("public", props.job.slug, "audio", "CREDITS.md"), p("public", props.job.slug, "stock", "CREDITS.md")]) if (existsSync(f)) credits.push(readFileSync(f, "utf8"));
  if (credits.length) writeFileSync(join(dir, "CREDITOS.md"), credits.join("\n\n"));
  log(`ok → ${mp4} (${(statSync(mp4).size / 1048576).toFixed(1)} MB)`);
  return mp4;
};

const lufs = (file: string) => {
  if (!has("ffmpeg")) return undefined;
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" });
  const m = (r.stderr as string).match(/I:\s+(-?[\d.]+) LUFS/g);
  return m?.at(-1);
};

// ── stills de conferência ──
const stills = async (slug: string) => {
  const { renderStill, selectComposition } = await import("@remotion/renderer");
  const serveUrl = await bundleOnce();
  const browser = browserExecutable() ?? undefined;
  const dir = p("out", slug, "stills");
  mkdirSync(dir, { recursive: true });
  const files: string[] = [];
  for (const lang of pickLangs(slug)) {
    const props = readJson<VideoProps>(p("jobs", slug, "_build", `${langId(lang)}.json`));
    for (const format of pickFormats(slug)) {
      const inputProps = { ...props, format } as unknown as Record<string, unknown>;
      const composition = await selectComposition({ serveUrl, id: "Video", inputProps, browserExecutable: browser, logLevel: "error" });
      const plan = planOf({ ...props, format });
      for (const s of plan.scenes) {
        const at = str("at") ? Number(str("at")) : 0.7;
        const frame = Math.min(composition.durationInFrames - 1, s.start + Math.round(s.frames * at));
        const out = join(dir, `${fmtId(format)}-${langId(lang)}-${String(s.index + 1).padStart(2, "0")}-${s.id}.jpg`);
        await renderStill({ composition, serveUrl, output: out, frame, inputProps, browserExecutable: browser, imageFormat: "jpeg", jpegQuality: 80, scale: 0.5, logLevel: "error" });
        files.push(out);
      }
    }
  }
  // folha de contato
  if (has("ffmpeg") && files.length) {
    for (const lang of pickLangs(slug)) for (const format of pickFormats(slug)) {
      const pre = `${fmtId(format)}-${langId(lang)}-`;
      const list = files.filter((f) => basename(f).startsWith(pre));
      const [fw, fh] = FORMATS[format];
      const w = format === "9:16" ? 270 : 480;
      const sheet = p("out", slug, `sheet-${fmtId(format)}-${langId(lang)}.jpg`);
      try {
        run("ffmpeg", sheetArgs(list, sheet, { w, h: Math.round((w * fh) / fw / 2) * 2, cols: format === "9:16" ? 6 : 3 }), { quiet: true });
        log(`folha de contato → ${sheet}`);
      } catch (e) {
        log(`folha de contato falhou: ${String(e).slice(0, 200)}`);
      }
    }
  }
  log(`${files.length} quadro(s) em ${dir}`);
};

// ── comandos ──
const main = async () => {
  switch (cmd) {
    case "new": {
      const slug = pos[0] ?? die("informe o slug: pnpm video new <slug> --brand <marca>");
      if (!/^[a-z0-9-]+$/.test(slug)) die("slug só com a-z, 0-9 e hífen");
      const f = p("jobs", slug, "job.json");
      if (existsSync(f)) die(`jobs/${slug}/job.json já existe`);
      const brand = str("brand") ?? die("informe a marca: --brand <marca> (brands/<marca>.json)");
      loadBrand(brand);
      const formats = (str("format") ?? "16:9").split(",");
      writeJson(f, {
        $schema: "../../schemas/job.schema.json",
        slug,
        title: str("title") ?? slug,
        client: str("client") ?? slug,
        brand,
        lang: str("lang") ?? "pt-BR",
        formats,
        music: { mode: "generate" },
        voice: { provider: "none" },
        captions: { mode: "both", style: "pop" },
        scenes: [
          { id: "capa", type: "cover", logo: true, title: "Título com [destaque]", subtitle: "Subtítulo curto" },
          { id: "ideia", type: "statement", text: "Uma frase de [impacto] sobre o produto" },
          { id: "lista", type: "list", title: "O que você [ganha]", items: ["Primeiro benefício", "Segundo benefício", "Terceiro benefício"] },
          { id: "cta", type: "cta", title: "Fale com a [gente]", button: "Saiba mais" },
        ],
      });
      mkdirSync(p("public", slug), { recursive: true });
      log(`criado jobs/${slug}/job.json e public/${slug}/ (coloque os assets lá)`);
      build(slug);
      break;
    }
    case "index": {
      // Índice dos jobs para o Studio (src/jobs.generated.ts, não versionado). Roda no postinstall.
      log(`${writeIndex()} composição(ões) no índice`);
      break;
    }
    case "build": {
      await writeSchemas();
      const slugs = pos[0] ? [pos[0]] : listJobs();
      for (const s of slugs) build(s);
      if (!slugs.length) writeIndex();
      break;
    }
    case "music": {
      const slug = pos[0] ?? die("slug?");
      for (const lang of pickLangs(slug)) ensureMusic(resolveProps(slug, lang).props, true);
      build(slug);
      break;
    }
    case "voice": {
      const slug = pos[0] ?? die("slug?");
      const { generateVoice } = await import("./voice.ts");
      for (const lang of pickLangs(slug)) await generateVoice(slug, lang, opt.force === true);
      build(slug);
      break;
    }
    case "translate": {
      const slug = pos[0] ?? die("slug?");
      const to = str("to") ?? die("--to <idioma>");
      const job = loadJob(slug);
      const src = extractStrings(job);
      const f = p("jobs", slug, "i18n", `${to}.json`);
      const cur: Record<string, string> = existsSync(f) ? readJson(f) : {};
      const todo = Object.keys(src).filter((k) => !cur[k]);
      if (opt.auto) {
        const { translate } = await import("./translate.ts");
        const done = await translate(Object.fromEntries(todo.map((k) => [k, src[k]])), job.lang, to);
        Object.assign(cur, done);
      } else for (const k of todo) cur[k] = "";
      const ordered = Object.fromEntries(Object.keys(src).map((k) => [k, cur[k] ?? ""]));
      writeJson(f, ordered);
      writeJson(p("jobs", slug, "i18n", `${to}.source.json`), src);
      if (!job.langs?.includes(to)) {
        const raw = readJson<Record<string, unknown>>(p("jobs", slug, "job.json"));
        raw.langs = [...new Set([job.lang, ...(job.langs ?? []), to])];
        writeJson(p("jobs", slug, "job.json"), raw);
      }
      const left = Object.values(ordered).filter((v) => !v).length;
      log(`jobs/${slug}/i18n/${to}.json: ${Object.keys(ordered).length} textos, ${left} a traduzir (original em ${to}.source.json)`);
      build(slug);
      break;
    }
    case "plan": {
      const slug = pos[0] ?? die("slug?");
      for (const lang of pickLangs(slug)) {
        const { props } = resolveProps(slug, lang);
        const plan = planOf(props);
        console.log(`\n${slug} [${lang}] ${(plan.total / plan.fps).toFixed(1)} s · ${plan.bpm ?? "-"} BPM · transição ${plan.T} f`);
        for (const s of plan.scenes)
          console.log(`  ${String(s.index + 1).padStart(2)}. ${s.id.padEnd(16)} ${s.scene.type.padEnd(9)} ${(s.start / plan.fps).toFixed(2).padStart(6)}s  ${((s.frames - plan.T) / plan.fps).toFixed(2).padStart(5)}s  ${s.transition.padEnd(7)} ${s.camera.padEnd(8)} ${props.voice[s.id] ? `voz ${props.voice[s.id].seconds.toFixed(1)}s` : ""}`);
        console.log(`  efeitos: ${plan.sfx.map((e) => `${e.name}@${(e.frame / plan.fps).toFixed(1)}`).join(" ")}`);
        console.log(`  legendas: ${plan.captions.length} palavra(s), ${plan.burn.length} queimada(s)`);
      }
      break;
    }
    case "stills": {
      const slug = pos[0] ?? die("slug?");
      build(slug, { music: false });
      await stills(slug);
      break;
    }
    case "render": {
      const slug = pos[0] ?? die("slug?");
      const all = build(slug);
      const done: string[] = [];
      for (const lang of pickLangs(slug)) for (const format of pickFormats(slug)) done.push(await renderOne(all[lang], format));
      for (const f of done) { const l = lufs(f); if (l) log(`${basename(f)}: ${l}`); }
      break;
    }
    case "doctor": {
      const { doctor } = await import("./doctor.ts");
      await doctor();
      break;
    }
    default:
      console.log(readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).slice(0, 13).map((l) => l.slice(3)).join("\n"));
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

