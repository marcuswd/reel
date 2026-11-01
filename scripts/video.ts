#!/usr/bin/env tsx
// CLI do gerador de vídeos.  pnpm video <comando> <pasta do job> [...]
// Tudo do vídeo fica na pasta do job (fora deste repositório); veja scripts/lib/workspace.ts.
//
//   new <pasta> --brand <marca|brand.json> [--format 9:16,16:9] [--lang pt-BR]
//   build <pasta>                       valida, aplica idiomas/locução e gera a trilha
//   voice <pasta> [--lang x] [--force]  gera a locução (TTS) das cenas com "voice"
//   music <pasta> [--lang x] [--force]  (re)gera a trilha sincronizada aos cortes
//   translate <pasta> --to en [--auto]  cria/completa <pasta>/i18n/<lang>.json
//   stills <pasta> [--lang x] [--format 9:16]   um quadro por cena + folha de contato em <pasta>/out
//   render <pasta> [--lang x|all] [--format x|all] [--draft] [--dest pasta]   entrega em <pasta>/entregas/<data>
//   plan <pasta> [--lang x]             mostra a timeline (cenas, durações, transições, efeitos)
//   check <pasta>                       valida job, marca, material, traduções e locução sem renderizar
//   qc <pasta> [--file x.mp4]           revisa a última entrega (também roda no fim do render)
//   studio <pasta>                      abre o Studio com o job
//   doctor                              confere ffmpeg, python, chaves e rede
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { FORMATS, type FormatKey, type VideoProps } from "../src/core/schema.ts";
import { musicBrief } from "../src/core/timeline.ts";
import { toSrt, toVtt } from "../src/core/srt.ts";
import { browserExecutable, die, fmtId, has, hash, langId, log, p, parseArgs, python, readJson, run, spawnPlan, today, userPath, writeJson } from "./lib/env.ts";
import { sheetArgs } from "./lib/sheet.ts";
import { cube, lutFilter } from "./lib/lut.ts";
import { parseBlack, parseFrozen, parseLufs, parseSilence, review, samplePoints } from "./lib/qc.ts";
import { applyI18n, buildFile, extractStrings, i18nFile, langsOf, loadBrand, loadJob, loadVoice, musicFile, planOf, resolveProps, writeIndex, writeResolved } from "./lib/resolve.ts";
import { checkJob } from "./lib/check.ts";
import { jobSchema } from "../src/core/schema.ts";
import { brandCandidates, fileOf, stage, studioPublic, useWorkspace, ws } from "./lib/workspace.ts";

const [cmd, ...rest] = process.argv.slice(2);
const { pos, opt } = parseArgs(rest);
const str = (k: string) => (typeof opt[k] === "string" ? (opt[k] as string) : undefined);

const pickLangs = (_slug: string) => {
  const job = loadJob();
  const l = str("lang");
  return !l ? [job.lang] : l === "all" ? langsOf(job) : l.split(",");
};
const pickFormats = (_slug: string): FormatKey[] => {
  const job = loadJob();
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
  const out = fileOf(rel);
  const stamp = `${out}.json`;
  const h = hash(brief);
  if (!force && existsSync(out) && existsSync(stamp) && readJson<{ hash: string }>(stamp).hash === h) return { ...props, musicSrc: rel };
  const briefFile = join(ws().dir, "_build", `music-${langId(props.langCode)}.json`);
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
  const job = loadJob();
  loadBrand();
  const all: Record<string, VideoProps> = {};
  for (const lang of langsOf(job)) {
    let { props, missing } = resolveProps(slug, lang);
    if (missing.length && lang !== job.lang) log(`${lang}: ${missing.length} texto(s) sem tradução (usando o original): ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? "…" : ""}`);
    const withVoice = job.scenes.filter((s) => s.voice).length;
    if (job.voice.provider !== "none" && withVoice && Object.keys(props.voice).length < withVoice) log(`${lang}: locução faltando em ${withVoice - Object.keys(props.voice).length} cena(s). Rode: pnpm video voice "${ws().dir}" --lang ${lang}`);
    if (opts.music !== false) props = ensureMusic(props, opt.force === true);
    writeResolved(slug, lang, props);
    all[lang] = props;
  }
  log(`build ok: ${slug} (${Object.keys(all).join(", ")})`);
  return all;
};

// ── render ──
/** WebGL (3D, mapa) precisa do ANGLE no Chromium headless. */
const GL = { gl: (process.env.REEL_GL ?? (process.platform === "linux" ? "swangle" : "angle")) as "angle" | "swangle" | "egl" | "vulkan" | "swiftshader" };
const bundleOnce = (() => {
  let url: Promise<string> | null = null;
  return () => {
    if (!url) {
      url = (async () => {
        const { bundle } = await import("@remotion/bundler");
        log("empacotando o projeto…");
        const url = await bundle({ entryPoint: p("src", "index.ts"), publicDir: p("public") });
        stage(join(url, "public"), "copy"); // material do job e da marca entram só no bundle temporário
        return url;
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

/** .cube do look da marca (gerado ou o arquivo próprio), ou null sem look. */
const lutOf = (props: VideoProps): string | null => {
  const g = props.brand.grade;
  if (!g || g === "none") return null;
  if (typeof g === "object") return fileOf(g.lut);
  const f = join(ws().dir, "out", `look-${g}.cube`);
  mkdirSync(join(ws().dir, "out"), { recursive: true });
  writeFileSync(f, cube(g));
  return f;
};
/** Aplica o look a um vídeo ou imagem (ffmpeg lut3d). */
const applyLut = (lut: string, input: string, output: string, opts: { draft?: boolean } = {}) => {
  const video = /\.(mp4|mov|webm)$/i.test(input);
  run("ffmpeg", ["-y", "-loglevel", "error", "-i", input, "-vf", lutFilter(lut),
    ...(video ? ["-c:v", "libx264", "-crf", opts.draft ? "28" : "16", "-preset", opts.draft ? "veryfast" : "medium", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart"] : ["-frames:v", "1", "-q:v", "2"]),
    output], { quiet: true });
};

/** Entrega: --dest <pasta> ou <pasta do job>/entregas, sempre numa subpasta com a data. */
const outDir = (_props: VideoProps) => resolve(str("dest") ? userPath(str("dest")!) : join(ws().dir, "entregas"), today());

const renderOne = async (props: VideoProps, format: FormatKey) => {
  const { renderMedia, renderStill, selectComposition } = await import("@remotion/renderer");
  const serveUrl = await bundleOnce();
  const inputProps = { ...props, format } as unknown as Record<string, unknown>;
  const browser = browserExecutable();
  const composition = await selectComposition({ serveUrl, id: "Video", inputProps, browserExecutable: browser ?? undefined, logLevel: "error", chromiumOptions: GL });
  const plan = planOf({ ...props, format });
  const name = `${props.job.slug}-${fmtId(format)}-${langId(props.langCode)}`;
  const work = join(ws().dir, "out");
  const tmp = join(work, `${name}.mp4`);
  mkdirSync(work, { recursive: true });
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
    chromiumOptions: GL,
    timeoutInMilliseconds: 120000,
    logLevel: "error",
    onProgress: ({ progress }) => {
      const pc = Math.floor(progress * 10);
      if (pc !== last) { last = pc; process.stdout.write(`  ${pc * 10}%`); }
    },
  });
  process.stdout.write("\n");
  const lut = has("ffmpeg") ? lutOf(props) : null;
  if (lut) {
    log(`look de cor: ${typeof props.brand.grade === "string" ? props.brand.grade : basename(lut)}`);
    const graded = join(work, `${name}-look.mp4`);
    applyLut(lut, tmp, graded, { draft });
    copyFileSync(graded, tmp);
  }
  // thumbnail: quadro da capa já assentada
  const first = plan.scenes[0];
  const thumbFrame = Math.min(composition.durationInFrames - 1, first.land + Math.round(first.frames * 0.55));
  const thumb = join(work, `${name}-thumb.png`);
  await renderStill({ composition, serveUrl, output: thumb, frame: thumbFrame, inputProps, browserExecutable: browser ?? undefined, imageFormat: "png", logLevel: "error", chromiumOptions: GL, timeoutInMilliseconds: 120000 });

  if (lut) applyLut(lut, thumb, thumb.replace(/\.png$/, "-look.png")), copyFileSync(thumb.replace(/\.png$/, "-look.png"), thumb);
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
  for (const f of [join(ws().dir, "audio", "CREDITS.md"), join(ws().dir, "stock", "CREDITS.md")]) if (existsSync(f)) credits.push(readFileSync(f, "utf8"));
  if (credits.length) writeFileSync(join(dir, "CREDITOS.md"), credits.join("\n\n"));
  log(`ok → ${mp4} (${(statSync(mp4).size / 1048576).toFixed(1)} MB)`);
  return mp4;
};

// ── QC do vídeo renderizado ──
/** Confere o mp4: resolução, duração, áudio, tela preta, imagem parada, silêncio, loudness; extrai 4 quadros. */
const qc = (file: string, props: VideoProps, format: FormatKey, draft = false) => {
  if (!has("ffmpeg") || !has("ffprobe")) return log("QC: ffmpeg/ffprobe ausentes, pulei");
  const pr = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", file], { encoding: "utf8" });
  const info = JSON.parse(pr.stdout || "{}") as { format?: { duration?: string }; streams?: { codec_type: string; width?: number; height?: number }[] };
  const v = info.streams?.find((x) => x.codec_type === "video");
  const audio = !!info.streams?.some((x) => x.codec_type === "audio");
  const duration = Number(info.format?.duration ?? 0);
  const plan = planOf({ ...props, format });
  const [fw, fh] = FORMATS[format];
  // rascunho (--draft) sai com metade da resolução; o qc avulso reconhece pelo tamanho
  const k = draft || (v?.width === Math.round(fw / 2) && v?.height === Math.round(fh / 2)) ? 0.5 : 1;
  const expectAudio = props.musicSrc !== null || Object.keys(props.voice).length > 0 || (props.job.sfx.enabled && plan.sfx.length > 0);
  const ff = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-vf", "blackdetect=d=0.4:pix_th=0.08,freezedetect=n=0.002:d=3", ...(audio ? ["-af", "silencedetect=n=-45dB:d=1.5,ebur128"] : ["-an"]), "-f", "null", "-"], { encoding: "utf8" });
  const err = ff.stderr as string;
  const r = review({
    probe: { duration, width: v?.width ?? 0, height: v?.height ?? 0, audio },
    expect: { duration: plan.total / plan.fps, width: Math.round(fw * k), height: Math.round(fh * k), audio: expectAudio, continuous: props.musicSrc !== null || Object.keys(props.voice).length > 0 },
    black: parseBlack(err), frozen: parseFrozen(err), silent: parseSilence(err), lufs: audio ? parseLufs(err) : undefined,
  });
  // quatro quadros numa folha, para olhar
  const dir = join(ws().dir, "out", "qc");
  mkdirSync(dir, { recursive: true });
  const base = basename(file, extname(file));
  const shots = samplePoints(duration).map((t, i) => {
    const out = join(dir, `${base}-${i + 1}.jpg`);
    run("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(t), "-i", file, "-frames:v", "1", "-vf", `scale=${format === "9:16" ? 270 : 480}:-2`, "-q:v", "3", out], { quiet: true });
    return out;
  });
  const sheet = join(dir, `${base}-qc.jpg`);
  try { run("ffmpeg", sheetArgs(shots, sheet, { w: format === "9:16" ? 270 : 480, h: Math.round(((format === "9:16" ? 270 : 480) * fh) / fw / 2) * 2, cols: 4 }), { quiet: true }); } catch { /* a folha é só conferência */ }
  const lufs = audio ? parseLufs(err) : undefined;
  log(`QC ${basename(file)}: ${duration.toFixed(1)} s · ${v?.width}x${v?.height}${lufs !== undefined ? ` · ${lufs} LUFS` : ""} · quadros em ${sheet}`);
  for (const p of r.problems) console.log(`  ✗ ${p}`);
  for (const w of r.warnings) console.log(`  ! ${w}`);
  if (!r.problems.length && !r.warnings.length) console.log("  ✓ sem problemas");
  return r;
};

// ── stills de conferência ──
const stills = async (slug: string) => {
  const { renderStill, selectComposition } = await import("@remotion/renderer");
  const serveUrl = await bundleOnce();
  const browser = browserExecutable() ?? undefined;
  const dir = join(ws().dir, "out", "stills");
  mkdirSync(dir, { recursive: true });
  const files: string[] = [];
  for (const lang of pickLangs(slug)) {
    const props = readJson<VideoProps>(buildFile(lang));
    for (const format of pickFormats(slug)) {
      const inputProps = { ...props, format } as unknown as Record<string, unknown>;
      const composition = await selectComposition({ serveUrl, id: "Video", inputProps, browserExecutable: browser, logLevel: "error", chromiumOptions: GL });
      const plan = planOf({ ...props, format });
      for (const s of plan.scenes) {
        const at = str("at") ? Number(str("at")) : 0.7;
        const frame = Math.min(composition.durationInFrames - 1, s.start + Math.round(s.frames * at));
        const out = join(dir, `${fmtId(format)}-${langId(lang)}-${String(s.index + 1).padStart(2, "0")}-${s.id}.jpg`);
        await renderStill({ composition, serveUrl, output: out, frame, inputProps, browserExecutable: browser, imageFormat: "jpeg", jpegQuality: 80, scale: 0.5, logLevel: "error", chromiumOptions: GL, timeoutInMilliseconds: 120000 });
        files.push(out);
      }
    }
  }
  // look de cor da marca também nos stills (a folha mostra a cor final)
  if (has("ffmpeg") && files.length) {
    const lut = lutOf(readJson<VideoProps>(buildFile(pickLangs(slug)[0])));
    if (lut) for (const f of files) { applyLut(lut, f, f + ".look.jpg"); copyFileSync(f + ".look.jpg", f); unlinkSync(f + ".look.jpg"); }
  }
  // folha de contato
  if (has("ffmpeg") && files.length) {
    for (const lang of pickLangs(slug)) for (const format of pickFormats(slug)) {
      const pre = `${fmtId(format)}-${langId(lang)}-`;
      const list = files.filter((f) => basename(f).startsWith(pre));
      const [fw, fh] = FORMATS[format];
      const w = format === "9:16" ? 270 : 480;
      const sheet = join(ws().dir, "out", `sheet-${fmtId(format)}-${langId(lang)}.jpg`);
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

// ── validação sem renderizar ──
const check = (print: boolean) => {
  const w = ws();
  const rawJob = readJson(join(w.dir, "job.json"));
  const at = (base: string) => (rel: string) => existsSync(join(base, rel));
  const r = checkJob(rawJob, readJson(w.brandFile), {
    job: at(w.dir),
    brand: at(w.brandDir),
    engine: at(p("public")),
    i18n: (lang) => (existsSync(i18nFile(lang)) ? readJson(i18nFile(lang)) : null),
    voiced: (lang) => Object.keys(loadVoice(applyI18n(jobSchema.parse(rawJob), lang).job, lang)),
  }, w.slug);
  if (print) {
    for (const e of r.errors) console.log(`  ✗ ${e}`);
    for (const x of r.warnings) console.log(`  ! ${x}`);
  }
  return r;
};
/** Antes de stills/render: erro de job, marca ou material para aqui, com o campo, em vez de falhar no meio do render. */
const preflight = () => {
  const r = check(false);
  if (r.errors.length) {
    for (const e of r.errors) console.log(`  ✗ ${e}`);
    die(`${r.errors.length} erro(s) no job; nada foi renderizado`);
  }
};

// ── comandos ──
/** Abre a pasta do job (1º argumento) e devolve o slug. */
const open = () => useWorkspace(pos[0] ?? die(`informe a pasta do job: pnpm video ${cmd} <pasta>`)).slug;

const main = async () => {
  switch (cmd) {
    case "new": {
      const dir = userPath(pos[0] ?? die('informe a pasta: pnpm video new "C:\\sites\\cliente\\videos\\promo" --brand <marca>'));
      const f = join(dir, "job.json");
      if (existsSync(f)) die(`${f} já existe`);
      const slug = str("slug") ?? basename(dir).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (!/^[a-z0-9-]+$/.test(slug)) die("slug só com a-z, 0-9 e hífen (use --slug)");
      const brand = str("brand") ?? die("informe a marca: --brand <nome> (procura brand.json na pasta ou acima) ou --brand caminho/brand.json");
      if (!brandCandidates(dir, brand).some((c) => existsSync(c))) die(`marca "${brand}" não encontrada. Procurei:\n${brandCandidates(dir, brand).map((c) => `  ${c}`).join("\n")}\nCrie com: pnpm brand new <pasta> --from https://site.com`);
      const formats = (str("format") ?? "16:9").split(",");
      writeJson(f, {
        $schema: relative(dir, p("schemas", "job.schema.json")).replace(/\\/g, "/"),
        slug,
        title: str("title") ?? slug,
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
      log(`criado ${f} (coloque o material na mesma pasta; caminhos no job são relativos a ela)`);
      useWorkspace(dir);
      build(slug, { music: false }); // valida; a trilha sai no build/render, com as cenas de verdade
      break;
    }
    case "index": {
      // Índice vazio para o Studio (src/jobs.generated.ts, não versionado). Roda no postinstall.
      writeIndex();
      log("índice do Studio recriado (vazio)");
      break;
    }
    case "schemas": {
      await writeSchemas();
      log("schemas/job.schema.json e schemas/brand.schema.json atualizados");
      break;
    }
    case "build": {
      const slug = open();
      await writeSchemas();
      build(slug);
      break;
    }
    case "check": {
      const slug = open();
      const r = check(true);
      log(`${slug}: ${r.errors.length} erro(s), ${r.warnings.length} aviso(s) · marca ${ws().brandFile}`);
      process.exit(r.errors.length ? 1 : 0);
    }
    case "qc": {
      // pnpm video qc <pasta> [--file entregas/<data>/x.mp4]: revisa a última entrega (ou o arquivo dado)
      const slug = open();
      let files: string[] = [];
      if (str("file")) files = [userPath(str("file")!)];
      else {
        const root = join(ws().dir, "entregas");
        const day = existsSync(root) ? readdirSync(root).sort().at(-1) : undefined;
        if (day) files = readdirSync(join(root, day)).filter((x) => x.endsWith(".mp4")).map((x) => join(root, day, x));
      }
      if (!files.length) die("nenhum mp4 em <pasta>/entregas; renderize antes ou passe --file");
      let bad = 0;
      for (const f of files) {
        const m = basename(f).match(/-(\d+x\d+)-([a-z0-9-]+?)(?:-v\d+)?\.mp4$/);
        const format = (m ? m[1].replace("x", ":") : loadJob().formats[0]) as FormatKey;
        const lang = m ? (langsOf(loadJob()).find((l) => langId(l) === m[2]) ?? loadJob().lang) : loadJob().lang;
        bad += qc(f, readJson<VideoProps>(buildFile(lang)), format)?.problems.length ?? 0;
      }
      process.exit(bad ? 1 : 0);
    }
    case "studio": {
      const slug = open();
      build(slug);
      const n = writeIndex(ws());
      const pub = studioPublic();
      log(`Studio com ${slug} (${n} composição(ões)); material servido de ${ws().dir}`);
      // Ctrl+C fecha o Studio; este processo espera e depois esvazia o índice (nada do cliente fica no repositório)
      for (const sig of ["SIGINT", "SIGTERM", "SIGBREAK"] as const) process.on(sig, () => {});
      const sp = spawnPlan(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["exec", "remotion", "studio", "--public-dir", pub]);
      const s = spawnSync(sp.cmd, sp.args, { cwd: p(), stdio: "inherit", shell: sp.shell });
      writeIndex();
      process.exit(s.status ?? 0);
    }
    case "music": {
      const slug = open();
      for (const lang of pickLangs(slug)) ensureMusic(resolveProps(slug, lang).props, true);
      build(slug);
      break;
    }
    case "voice": {
      const slug = open();
      const { generateVoice } = await import("./voice.ts");
      for (const lang of pickLangs(slug)) await generateVoice(slug, lang, opt.force === true);
      build(slug);
      break;
    }
    case "translate": {
      const slug = open();
      const to = str("to") ?? die("--to <idioma>");
      const job = loadJob();
      const src = extractStrings(job);
      const f = i18nFile(to);
      const cur: Record<string, string> = existsSync(f) ? readJson(f) : {};
      const todo = Object.keys(src).filter((k) => !cur[k]);
      if (opt.auto) {
        const { translate } = await import("./translate.ts");
        const done = await translate(Object.fromEntries(todo.map((k) => [k, src[k]])), job.lang, to);
        Object.assign(cur, done);
      } else for (const k of todo) cur[k] = "";
      const ordered = Object.fromEntries(Object.keys(src).map((k) => [k, cur[k] ?? ""]));
      writeJson(f, ordered);
      writeJson(i18nFile(`${to}.source`), src);
      if (!job.langs?.includes(to)) {
        const jf = join(ws().dir, "job.json");
        const raw = readJson<Record<string, unknown>>(jf);
        raw.langs = [...new Set([job.lang, ...(job.langs ?? []), to])];
        writeJson(jf, raw);
      }
      const left = Object.values(ordered).filter((v) => !v).length;
      log(`${f}: ${Object.keys(ordered).length} textos, ${left} a traduzir (original em ${to}.source.json)`);
      build(slug);
      break;
    }
    case "plan": {
      const slug = open();
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
      const slug = open();
      preflight();
      build(slug, { music: false });
      await stills(slug);
      break;
    }
    case "render": {
      const slug = open();
      preflight();
      const all = build(slug);
      const done: string[] = [];
      for (const lang of pickLangs(slug)) for (const format of pickFormats(slug)) done.push(await renderOne(all[lang], format));
      let bad = 0;
      for (const [i, f] of done.entries()) bad += qc(f, all[pickLangs(slug)[Math.floor(i / pickFormats(slug).length)]], pickFormats(slug)[i % pickFormats(slug).length], opt.draft === true)?.problems.length ?? 0;
      if (bad) die(`QC encontrou ${bad} problema(s): confira antes de entregar`);
      break;
    }
    case "doctor": {
      const { doctor } = await import("./doctor.ts");
      await doctor();
      break;
    }
    default:
      console.log(readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).slice(0, 17).map((l) => l.slice(3)).join("\n"));
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

