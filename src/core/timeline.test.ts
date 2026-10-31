import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { props, words } from "./testing";
import { countWords, onScreenShare, planTimeline, readingSeconds, stripMarks } from "./timeline";

const onBeat = (frame: number, T: number, beat: number) => {
  const k = (frame - T) / beat;
  return Math.abs(k - Math.round(k)) * beat <= 0.5 + 1e-9; // arredondado ao frame mais próximo do tempo
};

describe("texto", () => {
  test("colchetes de destaque não contam", () => {
    assert.equal(stripMarks("Fale com a [gente]"), "Fale com a gente");
    assert.equal(countWords("Fale com a [gente]", undefined, "  de novo "), 6);
  });
});

describe("duração por cena", () => {
  test("texto mais longo dura mais; nunca abaixo do mínimo do tipo", () => {
    const curto = readingSeconds({ id: "a", type: "statement", text: "Oi" }, "normal");
    const longo = readingSeconds({ id: "a", type: "statement", text: "uma frase bem mais longa com muitas palavras para ler com calma" }, "normal");
    assert.ok(longo > curto);
    assert.equal(readingSeconds({ id: "a", type: "screen", src: "x.png", title: "Oi" }, "fast"), 4.5);
  });
  test("ritmo calm alonga e fast encurta", () => {
    const s = { id: "a", type: "statement" as const, text: "uma frase com várias palavras para medir o ritmo de leitura" };
    assert.ok(readingSeconds(s, "calm") > readingSeconds(s, "normal"));
    assert.ok(readingSeconds(s, "fast") < readingSeconds(s, "normal"));
  });
  test("duration força a duração, arredondada para cima ao tempo", () => {
    // 120 bpm a 30 fps: 15 frames por tempo; 4 s = 120 frames = 8 tempos
    const p = planTimeline(props({ job: { music: { mode: "generate", bpm: 120, volume: 0.9 }, scenes: [{ id: "a", type: "statement", text: "x", duration: 4 }, { id: "b", type: "logo" }] } }));
    assert.equal(p.beat, 15);
    assert.equal(p.scenes[1].land - p.scenes[0].land, 120);
  });
  test("cena com locução cobre a fala com respiro", () => {
    const voice = { ideia: { src: "v.mp3", seconds: 6, words: words("um dois três") } };
    const p = planTimeline(props({ voice }));
    const s = p.scenes[1];
    const util = p.scenes[2].land - s.land;
    assert.ok(util >= (s.voiceAt - p.T) + 6 * p.fps, `útil ${util} < fala`);
  });
});

describe("cortes no tempo da música", () => {
  for (const [nome, music, brandBpm] of [
    ["bpm do job", { mode: "generate" as const, bpm: 128, volume: 0.9 }, undefined],
    ["bpm da marca", { mode: "generate" as const, volume: 0.9 }, 96],
  ] as const) {
    test(nome, () => {
      const p = planTimeline(props({ job: { music }, brand: brandBpm ? { audio: { mood: "calm", bpm: brandBpm } } : {} }));
      assert.equal(p.bpm, music.bpm ?? brandBpm);
      for (const s of p.scenes) assert.ok(onBeat(s.land, p.T, p.beat), `${s.id} assenta em ${s.land}, fora do tempo`);
      assert.ok(onBeat(p.total, p.T, p.beat), "fim fora do tempo");
    });
  }
  test("sem música: meio segundo por tempo e bpm nulo", () => {
    const p = planTimeline(props({ job: { music: { mode: "none", volume: 0.9 } } }));
    assert.equal(p.bpm, null);
    assert.equal(p.beat, p.fps / 2);
  });
  test("cenas encadeadas: cada uma começa T frames antes da anterior terminar", () => {
    const p = planTimeline(props());
    assert.equal(p.scenes[0].start, 0);
    for (let i = 1; i < p.scenes.length; i++) assert.equal(p.scenes[i - 1].start + p.scenes[i - 1].frames, p.scenes[i].start + p.T);
    const last = p.scenes.at(-1)!;
    assert.equal(p.total, last.start + last.frames);
  });
  test("primeira cena sem transição; transição de job é respeitada", () => {
    const p = planTimeline(props({ job: { defaults: { transition: "wipe" } } }));
    assert.equal(p.scenes[0].transition, "none");
    assert.ok(p.scenes.slice(1).every((s) => s.transition === "wipe"));
  });
});

describe("efeitos", () => {
  test("no máximo um a cada 0,25 s (exceto o riser)", () => {
    const p = planTimeline(props({ job: { scenes: [
      { id: "a", type: "cover", title: "x", logo: true },
      { id: "b", type: "list", title: "x", items: ["1", "2", "3", "4", "5", "6", "7", "8"] },
      { id: "c", type: "stats", items: [{ value: 1, label: "a" }, { value: 2, label: "b" }, { value: 3, label: "c" }] },
      { id: "d", type: "logo" },
    ] } }));
    const gap = Math.round(p.fps * 0.25);
    const fx = p.sfx.filter((s) => s.name !== "riser");
    for (let i = 1; i < fx.length; i++) assert.ok(fx[i].frame - fx[i - 1].frame >= gap, `${fx[i - 1].name}@${fx[i - 1].frame} e ${fx[i].name}@${fx[i].frame}`);
    assert.ok(p.sfx.some((s) => s.name === "riser"), "fecho com logo pede riser");
  });
  test("sfx desligado: nenhum efeito", () => {
    assert.equal(planTimeline(props({ job: { sfx: { enabled: false, pack: "_lib/sfx", volume: 1 } } })).sfx.length, 0);
  });
});

describe("legendas", () => {
  test("palavras da locução ganham o deslocamento da cena", () => {
    const voice = { ideia: { src: "v.mp3", seconds: 1.5, words: words("olá mundo", 0, 500) } };
    const p = planTimeline(props({ voice }));
    const s = p.scenes[1];
    const from = ((s.start + s.voiceAt) / p.fps) * 1000;
    assert.deepEqual(p.captions.map((c) => [c.text, c.startMs]), [["olá", from], ["mundo", from + 500]]);
    assert.deepEqual(p.speech, [{ from: s.start + s.voiceAt, to: s.start + s.voiceAt + 45 }]);
  });
  test("vídeo falado: aplica o trim e corta o que passa da cena", () => {
    const scenes = [{ id: "fala", type: "media" as const, media: { src: "v.mp4", trim: 1, muted: false }, duration: 2 }, { id: "fim", type: "logo" as const }];
    const clip = words("a b c d e f g h", 0, 500); // 0 a 4 s no clipe
    const p = planTimeline(props({ job: { scenes }, clipCaptions: { fala: clip } }));
    const s = p.scenes[0];
    const end = ((s.start + s.frames) / p.fps) * 1000;
    assert.ok(p.captions.length > 0 && p.captions.length < clip.length);
    assert.equal(p.captions[0].text, "c"); // começa em 1 s do clipe (trim)
    assert.ok(p.captions.every((c) => c.startMs >= 0 && c.startMs < end));
  });
});

describe("legenda queimada", () => {
  // cena "ideia": texto na tela "Uma frase curta"
  const repete = { ideia: { src: "v.mp3", seconds: 1.5, words: words("Uma frase curta.") } };
  const nova = { ideia: { src: "v.mp3", seconds: 2, words: words("Isto é dito, não escrito") } };
  test("fala que repete a tela não é queimada, mas fica no .srt", () => {
    const p = planTimeline(props({ voice: repete }));
    assert.equal(p.captions.length, 3);
    assert.equal(p.burn.length, 0);
  });
  test("fala com texto novo é queimada", () => {
    assert.equal(planTimeline(props({ voice: nova })).burn.length, 5);
  });
  test("whenOnScreen show queima sempre; mode file nunca queima", () => {
    assert.equal(planTimeline(props({ voice: repete, job: { captions: { mode: "both", style: "pop", whenOnScreen: "show" } } })).burn.length, 3);
    assert.equal(planTimeline(props({ voice: nova, job: { captions: { mode: "file", style: "pop", whenOnScreen: "hide" } } })).burn.length, 0);
  });
  test("comparação ignora acento, caixa, pontuação e colchetes", () => {
    const s = { id: "a", type: "statement" as const, text: "Vídeos que [vendem], gerados por código" };
    assert.equal(onScreenShare(["videos", "QUE", "vendem!", "gerados", "por", "codigo."], s), 1);
    assert.equal(onScreenShare(["outra", "coisa"], s), 0);
  });
});
