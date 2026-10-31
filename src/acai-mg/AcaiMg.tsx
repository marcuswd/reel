import React from "react";
import { AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { Abertura, Cta, Diferenciais, Entregas, Frutas, Polpas, Xarope } from "./scenes";
import { c, clamp, inOut } from "./theme";

// Durações em frames (30 fps). Todas múltiplas de 15 = 1 batida a 120 BPM,
// então cada corte cai no tempo da trilha. Conferidas contra o tempo de leitura (~3 palavras/s).
export const D = {
  abertura: 90,
  polpas: 135,
  frutas: 120,
  xarope: 120,
  entregas: 120,
  diferenciais: 120,
  cta: 150,
} as const;

const order = ["abertura", "polpas", "frutas", "xarope", "entregas", "diferenciais", "cta"] as const;
const scenes: Record<(typeof order)[number], React.FC> = {
  abertura: Abertura,
  polpas: Polpas,
  frutas: Frutas,
  xarope: Xarope,
  entregas: Entregas,
  diferenciais: Diferenciais,
  cta: Cta,
};

/** Frame de início de cada cena. */
export const at = order.reduce(
  (acc, k, i) => ({ ...acc, [k]: i === 0 ? 0 : acc[order[i - 1]] + D[order[i - 1]] }),
  {} as Record<(typeof order)[number], number>,
);
export const ACAI_MG_DURATION = order.reduce((s, k) => s + D[k], 0);

// ── Transição: bolha de cor que cobre o corte e se abre do lado oposto ──
const W = 7; // frames de cada lado do corte
const wipeColors = [c.magenta, c.orange, c.green, c.magenta, c.orange, c.acaiVivid];
const Wipe: React.FC<{ cut: number; color: string; flip: boolean }> = ({ cut, color, flip }) => {
  const frame = useCurrentFrame();
  if (frame < cut - W || frame > cut + W) return null;
  const R = 2300;
  const grow = interpolate(frame, [cut - W, cut], [0, R], { ...clamp, easing: inOut });
  const shrink = interpolate(frame, [cut, cut + W], [R, 0], { ...clamp, easing: inOut });
  const [ax, ay, bx, by] = flip ? [1080, 1920, 0, 0] : [0, 1920, 1080, 0];
  const before = frame <= cut;
  const r = before ? grow : shrink;
  const x = before ? ax : bx;
  const y = before ? ay : by;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: color, clipPath: `circle(${r}px at ${x}px ${y}px)` }} />
      {/* rastro de bolinhas */}
      {[0, 1, 2].map((i) => (
        <AbsoluteFill
          key={i}
          style={{ background: c.acaiDeep, opacity: 0.18, clipPath: `circle(${Math.max(0, r - 160 - i * 120)}px at ${x}px ${y}px)` }}
        />
      ))}
    </AbsoluteFill>
  );
};

// ── Áudio ── (gerado por scripts/synth-acai-mg.py; trilha a 120 BPM, cortes nas batidas)
const audio = (f: string) => staticFile(`distribuidora-acai-mg/audio/${f}`);
type Sfx = { at: number; file: string; vol: number };
const sfx: Sfx[] = [
  // transições: whoosh 6 frames antes de cada corte
  ...order.slice(1).map((k) => ({ at: at[k] - 6, file: "sfx-whoosh-01.mp3", vol: 0.45 })),
  { at: at.abertura + 14, file: "sfx-pop-01.mp3", vol: 0.6 }, // logo
  { at: at.polpas + 22, file: "sfx-pop-02.mp3", vol: 0.45 }, // embalagens
  { at: at.polpas + 62, file: "sfx-hit-01.mp3", vol: 0.45 }, // selo 12%
  { at: at.frutas + 10, file: "sfx-pop-01.mp3", vol: 0.45 }, // cesta
  { at: at.xarope + 46, file: "sfx-hit-01.mp3", vol: 0.6 }, // carimbo SUA MARCA
  { at: at.entregas + 30, file: "sfx-horn-01.mp3", vol: 0.45 }, // buzina do caminhão
  ...[0, 1, 2].map((i) => ({ at: at.diferenciais + 8 + i * 18, file: "sfx-hit-02.mp3", vol: 0.45 })), // carimbos
  { at: at.cta + 30, file: "sfx-chime-01.mp3", vol: 0.45 }, // WhatsApp
];

export const AcaiMg: React.FC = () => {
  const total = ACAI_MG_DURATION;
  return (
    <AbsoluteFill style={{ background: c.acaiDeep }}>
      {order.map((k) => {
        const Scene = scenes[k];
        return (
          <Sequence key={k} from={at[k]} durationInFrames={D[k]} name={k}>
            <Scene />
          </Sequence>
        );
      })}
      {order.slice(1).map((k, i) => (
        <Wipe key={k} cut={at[k]} color={wipeColors[i % wipeColors.length]} flip={i % 2 === 1} />
      ))}

      <Audio
        src={audio("music-divertida.mp3")}
        volume={(f) =>
          0.9 *
          interpolate(f, [0, 6], [0, 1], clamp) *
          interpolate(f, [total - 20, total], [1, 0], clamp)
        }
      />
      {sfx.map((s, i) => (
        <Sequence key={i} from={s.at} durationInFrames={60} name={`sfx ${s.file}`} layout="none">
          <Audio src={audio(s.file)} volume={s.vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
