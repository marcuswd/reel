import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { after, describe, test } from "node:test";
import { p } from "../lib/env.ts";

const read = (f: string) => JSON.parse(readFileSync(f, "utf8"));
const tmp = mkdtempSync(join(tmpdir(), "reel plugin "));
after(() => rmSync(tmp, { recursive: true, force: true }));

// pasta que faz o papel de CLAUDE_PLUGIN_ROOT (o plugin instalado)
const root = join(tmp, "root");
const put = (f: string, s = "x") => { mkdirSync(join(f, ".."), { recursive: true }); writeFileSync(f, s); };
put(join(root, "package.json"), JSON.stringify({ name: "reel", version: "1.0.0", dependencies: { a: "1" } }));
put(join(root, "pnpm-lock.yaml"), "lock");
put(join(root, "src", "index.ts"));
put(join(root, ".claude", "skills", "x", "SKILL.md"));
for (const d of [".git", "node_modules", "out", "jobs"]) put(join(root, d, "f"));

const data = join(tmp, "data");
const motor = join(data, "motor");
const setup = (env: Record<string, string> = {}, extra: string[] = []) => {
  const r = spawnSync(process.execPath, [p("scripts", "plugin", "setup.mjs"), "--root", root, "--data", data, "--no-install", ...extra], { encoding: "utf8", env: { ...process.env, REEL_DIR: join(tmp, "nao-existe"), ...env } });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
};

describe("plugin: preparação do motor", () => {
  test("copia o código para a pasta persistente, sem .git, node_modules, out nem jobs", () => {
    assert.match(setup(), new RegExp(`REEL=${motor.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")}\\s*$`));
    assert.deepEqual(readdirSync(motor).sort(), [".claude", "package.json", "pnpm-lock.yaml", "src"]);
    assert.equal(read(join(data, "setup.json")).version, "1.0.0");
  });
  test("atualização troca o código, mas mantém node_modules e .env", () => {
    put(join(motor, "node_modules", "dep"));
    put(join(motor, ".env"), "PIXABAY_API_KEY=x\n");
    put(join(motor, "src", "velho.ts"));
    put(join(root, "package.json"), JSON.stringify({ name: "reel", version: "1.1.0", dependencies: { a: "1" } }));
    assert.match(setup(), /copiando o motor 1\.1\.0/);
    assert.ok(existsSync(join(motor, "node_modules", "dep")));
    assert.ok(!existsSync(join(motor, "src", "velho.ts")));
    assert.equal(readFileSync(join(motor, ".env"), "utf8"), "PIXABAY_API_KEY=x\n");
  });
  test("mesma versão: não copia de novo", () => {
    assert.doesNotMatch(setup(), /copiando/);
  });
  test("opções do plugin vão para o .env, sem apagar o que já havia", () => {
    setup({ CLAUDE_PLUGIN_OPTION_UNSPLASH_ACCESS_KEY: "u", CLAUDE_PLUGIN_OPTION_PIXABAY_API_KEY: "y" });
    assert.equal(readFileSync(join(motor, ".env"), "utf8"), "PIXABAY_API_KEY=y\nUNSPLASH_ACCESS_KEY=u\n");
  });
});

test("--data vazio ou sem substituir não usa a pasta atual", () => {
  const cwd = join(tmp, "projeto-do-cliente");
  mkdirSync(cwd, { recursive: true });
  for (const bad of ["", "${CLAUDE_PLUGIN_DATA}"]) {
    const r = spawnSync(process.execPath, [p("scripts", "plugin", "setup.mjs"), "--root", root, "--data", bad, "--no-install"], { cwd, encoding: "utf8", env: { ...process.env, HOME: join(tmp, "home"), USERPROFILE: join(tmp, "home"), CLAUDE_PLUGIN_DATA: "" } });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /REEL=.*home.*\.claude.*plugins.*data.*reel-reel.*motor/);
    assert.deepEqual(readdirSync(cwd), []);
  }
});

describe("plugin: manifesto", () => {
  test("versão do plugin = versão do package.json", () => {
    assert.equal(read(p(".claude-plugin", "plugin.json")).version, read(p("package.json")).version);
  });
  test("o hook chama um script que existe; a skill de vídeo e as do Remotion estão no plugin", () => {
    const hook = read(p("hooks", "hooks.json")).hooks.SessionStart[0].hooks[0].command as string;
    const script = hook.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+)/)![1];
    assert.ok(existsSync(p(script)), script);
    assert.ok(existsSync(p("skills", "video", "SKILL.md")));
    assert.ok(existsSync(p(".claude", "skills", "remotion-best-practices", "SKILL.md")));
  });
});
