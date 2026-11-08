#!/usr/bin/env node
// Prepara o motor quando o reel roda como plugin do Claude Code.
//
// O plugin é instalado numa pasta que muda a cada atualização (CLAUDE_PLUGIN_ROOT). O motor precisa de
// node_modules (Remotion, Chromium baixado no 1º render), então roda de uma cópia na pasta persistente do
// plugin (CLAUDE_PLUGIN_DATA/motor), que sobrevive às atualizações:
//   - código: copiado de novo quando a versão ou a pasta do plugin mudam (node_modules e .env ficam);
//   - dependências: `pnpm install` só quando package.json ou pnpm-lock.yaml mudam;
//   - chaves: as opções do plugin (CLAUDE_PLUGIN_OPTION_*, só no hook) vão para motor/.env; na 1ª vez,
//     o .env de uma instalação antiga (REEL_DIR, projetos\mwd-ai-video na pasta da empresa ou C:\sites\remotion-base) é aproveitado.
//
//   node setup.mjs [--data <pasta>] [--root <pasta>]   prepara (espera, se outra preparação estiver rodando)
//   node setup.mjs --background                        hook SessionStart: dispara a preparação e sai na hora
//   node setup.mjs --no-install                        só copia (testes)
// Última linha da saída: REEL=<pasta do motor>.
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
// valor vazio ou "${...}" não substituído (skill fora do plugin) cai no padrão: nunca usar a pasta atual
const arg = (k) => { const i = args.indexOf(k); const v = i >= 0 ? args[i + 1] : undefined; return v && !v.includes("${") && !v.startsWith("--") ? v : undefined; };
const env = (k) => (process.env[k] && !process.env[k].includes("${") ? process.env[k] : undefined);
const root = resolve(arg("--root") ?? env("CLAUDE_PLUGIN_ROOT") ?? join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
const data = resolve(arg("--data") ?? env("CLAUDE_PLUGIN_DATA") ?? join(homedir(), ".claude", "plugins", "data", "reel-reel"));
const motor = join(data, "motor");
const stampFile = join(data, "setup.json");
const lockFile = join(data, "setup.lock");
const logFile = join(data, "setup.log");
const say = (m) => console.log(`reel: ${m}`);

mkdirSync(data, { recursive: true });

// ── hook: dispara e sai (a sessão não espera o pnpm install) ──
if (args.includes("--background")) {
  writeEnv(); // as opções do plugin só existem no ambiente do hook
  const rest = args.filter((a) => a !== "--background");
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), ...rest, "--root", root, "--data", data], { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
  process.exit(0);
}

const hashOf = (...files) => createHash("sha1").update(files.map((f) => (existsSync(f) ? readFileSync(f) : "")).join("\0")).digest("hex").slice(0, 12);
/** Só o que muda o node_modules: dependências, postinstall e o lock (a versão sobe a cada release e não conta). */
const depsHash = () => {
  let pkg = {};
  try { pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")); } catch {}
  const { dependencies, devDependencies, optionalDependencies, pnpm, scripts } = pkg;
  return createHash("sha1").update(JSON.stringify({ dependencies, devDependencies, optionalDependencies, pnpm, postinstall: scripts?.postinstall })).update(hashOf(join(root, "pnpm-lock.yaml"), join(root, "pnpm-workspace.yaml"))).digest("hex").slice(0, 12);
};
const readStamp = () => { try { return JSON.parse(readFileSync(stampFile, "utf8")); } catch { return {}; } };
const version = () => { try { return JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version; } catch { return "?"; } };

// ── trava: uma preparação por vez (outra sessão ou o hook podem estar rodando) ──
const STALE = 15 * 60 * 1000;
const lock = async () => {
  for (let waited = 0; ; waited += 2000) {
    try {
      writeFileSync(lockFile, String(process.pid), { flag: "wx" });
      return;
    } catch {
      if (Date.now() - statSync(lockFile).mtimeMs > STALE) { try { unlinkSync(lockFile); } catch {} continue; }
      if (waited === 0) say("outra preparação do motor está rodando; aguardando…");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
};
const unlock = () => { try { unlinkSync(lockFile); } catch {} };

// ── cópia do código ──
const KEEP = new Set(["node_modules", ".env", ".cache"]); // ficam no motor entre atualizações
const SKIP = new Set([".git", ".github", "node_modules", "out", ".env", ".cache", "jobs", "brands", "clientes"]);
const sync = () => {
  mkdirSync(motor, { recursive: true });
  for (const e of readdirSync(motor)) if (!KEEP.has(e)) rmSync(join(motor, e), { recursive: true, force: true });
  for (const e of readdirSync(root)) if (!SKIP.has(e)) cpSync(join(root, e), join(motor, e), { recursive: true });
};

// ── dependências ──
const pnpm = (cmdArgs) => {
  const win = process.platform === "win32";
  return spawnSync(win ? "pnpm.cmd" : "pnpm", cmdArgs, { cwd: motor, encoding: "utf8", shell: win, env: { ...process.env, INIT_CWD: motor } });
};
const install = () => {
  say("instalando dependências do motor (pnpm install, 1 a 2 minutos na 1ª vez)…");
  let r = pnpm(["install", "--frozen-lockfile"]);
  if (r.error || r.status !== 0) {
    if (r.error?.code === "ENOENT") throw new Error("pnpm não encontrado. Instale com: npm install -g pnpm");
    r = pnpm(["install"]); // lock de outra versão do pnpm
  }
  writeFileSync(logFile, `${r.stdout ?? ""}\n${r.stderr ?? ""}`);
  if (r.status !== 0) throw new Error(`pnpm install falhou (veja ${logFile})`);
};

// ── chaves ──
function writeEnv() {
  const opts = Object.entries(process.env).filter(([k, v]) => k.startsWith("CLAUDE_PLUGIN_OPTION_") && v).map(([k, v]) => [k.slice("CLAUDE_PLUGIN_OPTION_".length), v]);
  const envFile = join(motor, ".env");
  mkdirSync(motor, { recursive: true });
  // 1ª vez: aproveita o .env de uma instalação antiga do reel (sem imprimir nada dele)
  if (!existsSync(envFile)) {
    const old = [process.env.REEL_DIR, join(homedir(), "MARCUSWD", "projetos", "mwd-ai-video"), process.platform === "win32" ? "C:\\sites\\remotion-base" : undefined].filter(Boolean).map((d) => join(d, ".env")).find((f) => existsSync(f));
    if (old) { cpSync(old, envFile); say(`chaves copiadas de ${old}`); }
  }
  if (!opts.length) return;
  const lines = existsSync(envFile) ? readFileSync(envFile, "utf8").split(/\r?\n/) : [];
  while (lines.length && !lines.at(-1)) lines.pop();
  for (const [k, v] of opts) {
    const i = lines.findIndex((l) => l.startsWith(`${k}=`));
    if (i >= 0) lines[i] = `${k}=${v}`; else lines.push(`${k}=${v}`);
  }
  writeFileSync(envFile, lines.join("\n") + "\n");
}

// ── principal ──
await lock();
try {
  const stamp = readStamp();
  const v = version();
  const deps = depsHash();
  let copied = false;
  if (stamp.root !== root || stamp.version !== v || !existsSync(join(motor, "package.json"))) {
    say(`copiando o motor ${v} para ${motor}`);
    sync();
    copied = true;
  }
  writeEnv();
  const installed = existsSync(join(motor, "node_modules"));
  if (!args.includes("--no-install")) {
    if (stamp.deps !== deps || !installed) install();
    // a cópia apaga o que o postinstall gera (public/fonts, src/jobs.generated.ts): refaz sem reinstalar
    else if (copied && pnpm(["run", "postinstall"]).status !== 0) throw new Error("postinstall falhou");
  }
  writeFileSync(stampFile, JSON.stringify({ root, version: v, deps: args.includes("--no-install") ? stamp.deps : deps, at: new Date().toISOString() }, null, 2));
  say(`motor ${v} pronto`);
  console.log(`REEL=${motor}`);
} catch (e) {
  console.error(`reel: ${e.message}`);
  process.exitCode = 1;
} finally {
  unlock();
}
