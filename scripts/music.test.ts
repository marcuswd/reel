import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const py = spawnSync("python", ["-c", "import numpy, scipy"]);
const ff = spawnSync("ffmpeg", ["-version"]);
const ready = py.status === 0 && ff.status === 0;

const brief = { fps: 30, bpm: 70, offsetFrames: 0, totalFrames: 240, mood: "drone", hasVoice: true, scenes: [{ type: "cover", land: 0 }, { type: "statement", land: 120 }] };

function run(dir: string, name: string): string {
  const b = join(dir, "brief.json");
  writeFileSync(b, JSON.stringify(brief));
  const out = join(dir, name);
  const r = spawnSync("python", ["scripts/music.py", b, out], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return out;
}

test("mood drone: aceito pelo gerador, duração certa, sem clipping, não silencioso, determinístico", { skip: !ready }, () => {
  const dir = mkdtempSync(join(tmpdir(), "drone-"));
  const a = run(dir, "a.mp3");
  const m = spawnSync("ffmpeg", ["-hide_banner", "-i", a, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const max = Number(/max_volume: (-?[\d.]+) dB/.exec(m)?.[1]);
  const mean = Number(/mean_volume: (-?[\d.]+) dB/.exec(m)?.[1]);
  const dur = /Duration: (\d+):(\d+):([\d.]+)/.exec(m)!;
  const secs = Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]);
  assert.ok(Math.abs(secs - 8) < 0.3, `duração ${secs}`);
  assert.ok(max < 0, `pico ${max}`);
  assert.ok(mean > -50, `silêncio: média ${mean}`);
  assert.ok(statSync(a).size > 1000);
  const b = run(dir, "b.mp3");
  assert.deepEqual(readFileSync(a), readFileSync(b));
});
