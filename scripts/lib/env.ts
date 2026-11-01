// Utilidades comuns dos scripts (sem dependências externas).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

export const ROOT = resolve(import.meta.dirname, "..", "..");
export const p = (...parts: string[]) => resolve(ROOT, ...parts);
/**
 * Caminho dado pelo usuário, relativo à pasta de onde ele chamou o comando.
 * `pnpm --dir <motor> video ...` roda os scripts na pasta do motor, mas guarda a original em INIT_CWD.
 */
export const userPath = (x: string) => resolve(process.env.INIT_CWD ?? process.cwd(), x);

/** Carrega o .env sem imprimir valores. */
export const loadEnv = () => {
  const f = p(".env");
  if (!existsSync(f)) return;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
};
loadEnv();

// Atrás de proxy (ex.: nuvem do Claude), o fetch do Node precisa ser apontado para ele.
if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NO_FETCH_PROXY) {
  try {
    const { EnvHttpProxyAgent, setGlobalDispatcher } = await import("undici");
    setGlobalDispatcher(new EnvHttpProxyAgent());
  } catch { /* sem undici: fetch direto */ }
}

export const readJson = <T = unknown>(f: string): T => JSON.parse(readFileSync(f, "utf8").replace(/^﻿/, ""));
export const writeJson = (f: string, data: unknown) => {
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, JSON.stringify(data, null, 2) + "\n");
};
export const hash = (x: unknown) => createHash("sha1").update(typeof x === "string" ? x : JSON.stringify(x)).digest("hex").slice(0, 10);

/** Argumentos: posicionais + --chave valor / --flag */
export const parseArgs = (argv: string[]) => {
  const pos: string[] = [];
  const opt: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const k = argv[i].slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      opt[k] = v;
    } else pos.push(argv[i]);
  }
  return { pos, opt };
};

/**
 * Como chamar um programa sem que o shell reinterprete os argumentos.
 * Executáveis (ffmpeg, python, tar) vão direto, em qualquer sistema: assim `|`, `;`, `>` e espaços
 * chegam intactos (no Windows o cmd.exe tratava o `|` do xstack como pipe).
 * Só atalhos .cmd/.bat do Windows (npm.cmd) precisam de shell; nesse caso cada argumento vai entre aspas.
 */
export const spawnPlan = (cmd: string, args: string[], platform: NodeJS.Platform = process.platform) => {
  if (platform !== "win32" || !/\.(cmd|bat)$/i.test(cmd)) return { cmd, args, shell: false };
  const q = (a: string) => (/^[\w./:=@\\-]+$/.test(a) ? a : `"${a.replace(/"/g, '""')}"`);
  return { cmd: q(cmd), args: args.map(q), shell: true };
};

export const run = (cmd: string, args: string[], opts: { quiet?: boolean } = {}) => {
  const s = spawnPlan(cmd, args);
  const r = spawnSync(s.cmd, s.args, { cwd: ROOT, stdio: opts.quiet ? "pipe" : "inherit", encoding: "utf8", shell: s.shell });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} falhou (${r.status ?? r.error?.message})\n${r.stderr ?? ""}`);
  return r.stdout ?? "";
};
export const has = (cmd: string, args = ["-version"]) => {
  const s = spawnPlan(cmd, args);
  return spawnSync(s.cmd, s.args, { stdio: "ignore", shell: s.shell }).status === 0;
};
export const python = () => (has("python3", ["--version"]) ? "python3" : "python");

/** Chromium para render: REMOTION_BROWSER no .env, Playwright da nuvem do Claude, ou o do Remotion (padrão). */
export const browserExecutable = (): string | null => {
  if (process.env.REMOTION_BROWSER && existsSync(process.env.REMOTION_BROWSER)) return process.env.REMOTION_BROWSER;
  const cloud = "/opt/pw-browsers";
  if (existsSync(cloud)) {
    const r = spawnSync("bash", ["-lc", `ls -d ${cloud}/chromium_headless_shell-*/chrome-linux*/headless_shell 2>/dev/null | head -1`], { encoding: "utf8" });
    const f = r.stdout.trim();
    if (f && existsSync(f)) return f;
  }
  return null;
};

export const today = () => new Date().toLocaleDateString("sv-SE");
export const langId = (l: string) => l.toLowerCase().replace(/[^a-z0-9]+/g, "-");
export const fmtId = (f: string) => f.replace(":", "x");

export const log = (...a: unknown[]) => console.log("›", ...a);
export const die = (msg: string): never => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};
