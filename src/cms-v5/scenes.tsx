// Cenas novas da v5. As outras (capa, capítulo, tela, split, fecho) vêm da v4.
// Tudo o que "bate" com a música usa beatAt() e as listas de tempos de timeline.ts.
import type React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Shot } from "../cms-v4/Screen";
import { Stage } from "../cms-v4/brand";
import { Eyebrow, Rich, richFrames } from "../cms-v4/text";
import { c, clamp, ease, inOut, rise } from "../cms-v4/theme";
import { BEAT, BUILDER_BEATS, CARD_BEATS, RUSH_BEATS, beatAt } from "./timeline";

const H1: React.CSSProperties = { fontWeight: 400, letterSpacing: "-0.04em", lineHeight: 1.02 };
const pop = Easing.bezier(0.2, 1.4, 0.4, 1);

/** Pulso que acende em cada tempo e apaga até ao seguinte. */
const usePulse = (from: number) => {
  const frame = useCurrentFrame();
  if (frame < from) return 0;
  const k = ((frame - from) % BEAT) / BEAT;
  return Math.exp(-k * 5);
};

/* ───────── Novidades: um nome por tempo ───────── */
export const RushScene: React.FC<{ eyebrow: string; title: string; names: string[] }> = ({ eyebrow, title, names }) => {
  const frame = useCurrentFrame();
  const first = beatAt(RUSH_BEATS[0]);
  const last = beatAt(RUSH_BEATS[RUSH_BEATS.length - 1]);
  const beatPulse = usePulse(first);
  const pulse = frame <= last + BEAT ? beatPulse : 0;
  const idx = RUSH_BEATS.reduce((n, b, i) => (frame >= beatAt(b) ? i : n), -1);
  return (
    <Stage tone="dark">
      <AbsoluteFill style={{ background: `radial-gradient(900px circle at 70% 50%, rgba(0,170,255,${0.08 + pulse * 0.16}) 0%, transparent 65%)` }} />
      <div style={{ position: "absolute", left: 140, top: 150 }}>
        <Eyebrow label={eyebrow} start={beatAt(0) - 6} />
        <div style={{ ...H1, marginTop: 22, fontSize: 72 }}>
          <Rich text={title} start={beatAt(0)} gap={4} />
        </div>
      </div>
      {/* o nome do tempo actual, grande, a subir */}
      <div style={{ position: "absolute", left: 140, right: 140, top: 430, height: 260, overflow: "hidden" }}>
        {names.map((n, i) => {
          const at = beatAt(RUSH_BEATS[i]);
          const out = i < names.length - 1 ? beatAt(RUSH_BEATS[i + 1]) : 1e6;
          if (frame < at - 1 || frame > out + 6) return null;
          const yIn = interpolate(frame, [at - 1, at + 8], [270, 0], { ...clamp, easing: ease });
          const yOut = interpolate(frame, [out - 3, out + 5], [0, -270], { ...clamp, easing: inOut });
          return (
            <div
              key={n}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                ...H1,
                fontSize: n.length > 22 ? 118 : 150,
                whiteSpace: "nowrap",
                translate: `0px ${yIn + yOut}px`,
                color: i % 2 ? c.cyan : c.white,
              }}
            >
              {n}
            </div>
          );
        })}
      </div>
      {/* régua: um segmento por novidade */}
      <div style={{ position: "absolute", left: 140, right: 140, top: 760, display: "flex", gap: 14 }}>
        {names.map((n, i) => {
          const at = beatAt(RUSH_BEATS[i]);
          const on = interpolate(frame, [at - 2, at + 4], [0, 1], clamp);
          return (
            <div key={n} style={{ flex: 1 }}>
              <div style={{ height: 4, backgroundColor: "rgba(255,255,255,0.15)" }}>
                <div style={{ height: 4, width: `${on * 100}%`, backgroundColor: i === idx ? c.cyan : c.blue }} />
              </div>
              <div style={{ marginTop: 14, fontSize: 17, letterSpacing: 1.5, textTransform: "uppercase", color: i === idx ? c.cyan : "rgba(255,255,255,0.45)", opacity: on }}>
                {n}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", right: 140, top: 168, fontSize: 30, fontWeight: 300, color: c.mist, fontVariantNumeric: "tabular-nums", opacity: idx >= 0 ? 1 : 0 }}>
        {String(Math.max(1, idx + 1)).padStart(2, "0")} <span style={{ opacity: 0.5 }}>/ {String(names.length).padStart(2, "0")}</span>
      </div>
    </Stage>
  );
};

/* ───────── Lista com marcador ●── (igual à v4) ───────── */
const Items: React.FC<{ items: string[]; start: number; step?: number }> = ({ items, start, step = 22 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ marginTop: 46, display: "flex", flexDirection: "column", gap: 26 }}>
      {items.map((it, i) => {
        const s = start + i * step;
        return (
          <div key={it} style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", minWidth: 46, marginTop: 4 }}>
              <div style={{ width: 9, height: 9, borderRadius: 9, backgroundColor: c.blue, scale: String(interpolate(frame, [s, s + 8], [0, 1], clamp)) }} />
              <div style={{ height: 2, backgroundColor: c.blue, width: interpolate(frame, [s + 4, s + 16], [0, 30], { ...clamp, easing: ease }) }} />
            </div>
            <div style={{ fontSize: 36, color: c.text, lineHeight: 1.25 }}>
              <Rich text={it} start={s + 6} gap={3} accent={c.blue} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ───────── Páginas montadas: blocos a encaixar na grelha, um por tempo ───────── */
const BLOCKS = [
  { label: "Banner", col: 0, span: 12, row: 0, rows: 1, color: c.navy },
  { label: "Notícias", col: 0, span: 8, row: 1, rows: 2, color: c.blue },
  { label: "Eventos", col: 8, span: 4, row: 1, rows: 1, color: c.cyan, audience: "Só a Zona Luanda" },
  { label: "Enquete", col: 8, span: 4, row: 2, rows: 1, color: c.purple },
  { label: "Vídeo", col: 0, span: 6, row: 3, rows: 1, color: c.blue },
  { label: "Contagem", col: 6, span: 6, row: 3, rows: 1, color: c.navy },
];

export const BuilderScene: React.FC<{ chapter: string; title: string; items: string[] }> = ({ chapter, title, items }) => {
  const frame = useCurrentFrame();
  const W = 860;
  const pad = 26;
  const gap = 12;
  const colW = (W - pad * 2 - gap * 11) / 12;
  const rowH = 122;
  const H = pad * 2 + rowH * 4 + gap * 3;
  const gridOn = interpolate(frame, [beatAt(1), beatAt(2.5)], [0, 1], clamp);
  const audAt = beatAt(BUILDER_BEATS[BUILDER_BEATS.length - 1] + 2);
  const enter = interpolate(frame, [0, 30], [0, 1], { ...clamp, easing: ease });
  return (
    <Stage tone="light">
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", paddingLeft: 140 }}>
        <div style={{ width: 720 }}>
          <Eyebrow label={chapter} start={0} color={c.blue} width={60} />
          <div style={{ ...H1, marginTop: 26, fontSize: 76 }}>
            <Rich text={title} start={8} gap={5} accent={c.blue} />
          </div>
          <Items items={items} start={8 + richFrames(title, 5) + 6} step={BEAT * 2} />
        </div>
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 940,
          top: (1080 - H - 40) / 2,
          width: W,
          height: H + 40,
          backgroundColor: c.white,
          boxShadow: "0 40px 100px rgba(4,22,93,0.18), 0 0 0 1px rgba(4,22,93,0.06)",
          borderRadius: 8,
          overflow: "hidden",
          opacity: enter,
          transform: `perspective(2200px) rotateY(${(1 - enter) * -18}deg) translateY(${(1 - enter) * 80}px)`,
        }}
      >
        <div style={{ height: 40, backgroundColor: "#eef2f8", display: "flex", alignItems: "center", gap: 9, paddingLeft: 18 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((col) => (
            <div key={col} style={{ width: 11, height: 11, borderRadius: 9, backgroundColor: col }} />
          ))}
          <div style={{ marginLeft: 18, fontSize: 15, color: c.text, letterSpacing: 1 }}>Modo de edição · Página de início</div>
        </div>
        <div style={{ position: "relative", height: H }}>
          {/* 12 colunas */}
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: pad,
                bottom: pad,
                left: pad + i * (colW + gap),
                width: colW,
                backgroundColor: "rgba(3,110,242,0.07)",
                border: "1px dashed rgba(3,110,242,0.25)",
                opacity: interpolate(frame, [beatAt(1) + i * 1.2, beatAt(1) + i * 1.2 + 8], [0, 1], clamp) * (1 - 0.4 * interpolate(frame, [beatAt(BUILDER_BEATS[5]), beatAt(BUILDER_BEATS[5] + 1)], [0, 1], clamp)),
                scale: `1 ${gridOn}`,
                transformOrigin: "top",
              }}
            />
          ))}
          {BLOCKS.map((b, i) => {
            const at = beatAt(BUILDER_BEATS[i]);
            const p = interpolate(frame, [at - 4, at + 6], [0, 1], { ...clamp, easing: pop });
            const land = interpolate(frame, [at - 4, at], [0, 1], clamp);
            return (
              <div
                key={b.label}
                style={{
                  position: "absolute",
                  left: pad + b.col * (colW + gap),
                  top: pad + b.row * (rowH + gap),
                  width: b.span * colW + (b.span - 1) * gap,
                  height: b.rows * rowH + (b.rows - 1) * gap,
                  backgroundColor: b.color,
                  color: c.white,
                  padding: "18px 22px",
                  fontSize: 26,
                  fontWeight: 500,
                  opacity: land,
                  translate: `0px ${(1 - p) * -70}px`,
                  scale: String(1.08 - 0.08 * p),
                  boxShadow: `0 ${18 * (1 - p) + 4}px ${40 * (1 - p) + 10}px rgba(4,22,93,${0.25 * (1 - p) + 0.08})`,
                }}
              >
                {b.label}
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8, opacity: 0.35 }}>
                  {Array.from({ length: b.rows * 2 }, (_, k) => (
                    <div key={k} style={{ height: 8, width: `${80 - k * 14}%`, backgroundColor: c.white }} />
                  ))}
                </div>
                {b.audience ? (
                  <div
                    style={{
                      position: "absolute",
                      right: -10,
                      top: -18,
                      padding: "8px 14px",
                      backgroundColor: c.white,
                      color: c.blue,
                      fontSize: 17,
                      fontWeight: 600,
                      boxShadow: "0 10px 30px rgba(4,22,93,0.25)",
                      scale: String(interpolate(frame, [audAt - 3, audAt + 6], [0, 1], { ...clamp, easing: pop })),
                      whiteSpace: "nowrap",
                    }}
                  >
                    ● {b.audience}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </Stage>
  );
};

/* ───────── Segurança nova: cartões, um a cada dois tempos ───────── */
const Icon: React.FC<{ name: "key" | "badge" | "folder" | "layers"; size?: number }> = ({ name, size = 64 }) => {
  const p = { fill: "none", stroke: c.cyan, strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      {name === "key" ? (
        <>
          <rect x="14" y="28" width="36" height="26" rx="4" {...p} />
          <path d="M22 28v-8a10 10 0 0 1 20 0v8" {...p} />
          <circle cx="32" cy="40" r="3" {...p} />
          <path d="M32 43v5" {...p} />
        </>
      ) : name === "badge" ? (
        <>
          <path d="M10 26 32 12l22 14" {...p} />
          <path d="M14 26v22M24 26v22M40 26v22M50 26v22" {...p} />
          <path d="M8 52h48" {...p} />
        </>
      ) : name === "folder" ? (
        <>
          <path d="M8 18h18l5 6h25v28H8z" {...p} />
          <circle cx="38" cy="36" r="5" {...p} />
          <path d="M29 48a9 9 0 0 1 18 0" {...p} />
        </>
      ) : (
        <>
          <path d="M32 10 56 22 32 34 8 22z" {...p} />
          <path d="M8 32l24 12 24-12" {...p} />
          <path d="M8 42l24 12 24-12" {...p} />
        </>
      )}
    </svg>
  );
};

export const CardsScene: React.FC<{ chapter: string; title: string; cards: { name: string; text: string; icon: "key" | "badge" | "folder" | "layers" }[] }> = ({ chapter, title, cards }) => {
  const frame = useCurrentFrame();
  return (
    <Stage tone="dark">
      <AbsoluteFill style={{ padding: "0 140px", justifyContent: "center" }}>
        <Eyebrow label={chapter} start={0} />
        <div style={{ ...H1, marginTop: 26, fontSize: 96 }}>
          <Rich text={title} start={8} gap={5} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginTop: 70 }}>
          {cards.map((k, i) => {
            const at = beatAt(CARD_BEATS[i]);
            const open = interpolate(frame, [at - 3, at + 12], [100, 0], { ...clamp, easing: inOut });
            return (
              <div
                key={k.name}
                style={{
                  height: 380,
                  padding: "44px 38px",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderTop: `5px solid ${i % 2 ? c.blue : c.cyan}`,
                  clipPath: `inset(${open}% 0% 0% 0%)`,
                }}
              >
                <div style={{ scale: String(interpolate(frame, [at, at + 10], [0.4, 1], { ...clamp, easing: pop })), transformOrigin: "left top" }}>
                  <Icon name={k.icon} />
                </div>
                <div style={{ ...H1, fontSize: 44, marginTop: 34, ...rise(frame, at + 4, 20) }}>{k.name}</div>
                <div style={{ fontSize: 27, lineHeight: 1.35, color: c.mist, marginTop: 16, ...rise(frame, at + 8, 16) }}>{k.text}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

/* ───────── Tela à direita, texto à esquerda; o zoom acontece dentro da janela ───────── */
export const Window: React.FC<{ shot: Shot; width: number; zoomAt: number; zoomDur: number; maxZoom?: number; panFrom: number; panUntil: number }> = ({
  shot,
  width: W,
  zoomAt,
  zoomDur,
  maxZoom = 1.8,
  panFrom,
  panUntil,
}) => {
  const frame = useCurrentFrame();
  const Hv = Math.round(W * 0.625);
  const bar = 34;
  const imgH = (W * shot.ih) / shot.iw;
  const overflow = Math.max(0, imgH - Hv);
  const enter = interpolate(frame, [0, 40], [0, 1], { ...clamp, easing: ease });
  const pan = shot.pan ? interpolate(frame, [panFrom, panUntil], [0, shot.panTo ?? 1], { ...clamp, easing: inOut }) * overflow : 0;
  // câmara: centro e escala dentro da janela
  let s = 1;
  let cx = W / 2;
  let cy = pan + Hv / 2;
  if (shot.focus) {
    const f = shot.focus;
    const z = interpolate(frame, [zoomAt, zoomAt + zoomDur], [0, 1], { ...clamp, easing: inOut });
    const target = Math.max(1, Math.min(maxZoom, (0.94 * W) / (f.w * W), (0.9 * Hv) / (f.h * imgH)));
    s = 1 + (target - 1) * z;
    const fx = (f.x + f.w / 2) * W;
    const fy = (f.y + f.h / 2) * imgH;
    cx = cx + (fx - cx) * z;
    cy = cy + (fy - cy) * z;
    // não mostrar fora do print
    cx = Math.min(W - W / (2 * s), Math.max(W / (2 * s), cx));
    cy = Math.min(imgH - Hv / (2 * s), Math.max(Hv / (2 * s), cy));
  }
  const drift = interpolate(frame, [0, 300], [1, 1.03], clamp);
  return (
    <div
      style={{
        width: W,
        height: Hv + bar,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: c.white,
        boxShadow: "0 40px 100px rgba(4,22,93,0.2), 0 0 0 1px rgba(4,22,93,0.06)",
        opacity: interpolate(frame, [0, 10], [0, 1], clamp),
        transform: `perspective(2400px) translateY(${(1 - enter) * 120}px) rotateY(${(1 - enter) * -16}deg) rotateX(${(1 - enter) * 10}deg)`,
      }}
    >
      <div style={{ height: bar, backgroundColor: "#eef2f8", display: "flex", alignItems: "center", gap: 9, paddingLeft: 18 }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((col) => (
          <div key={col} style={{ width: 11, height: 11, borderRadius: 9, backgroundColor: col }} />
        ))}
        <div style={{ marginLeft: 18, height: 16, width: "36%", borderRadius: 99, backgroundColor: c.white }} />
      </div>
      <div style={{ position: "relative", width: W, height: Hv, overflow: "hidden" }}>
        <Img
          src={staticFile(shot.src)}
          style={{ position: "absolute", left: 0, top: 0, width: W, transformOrigin: "0 0", transform: `translate(${W / 2}px, ${Hv / 2}px) scale(${s * drift}) translate(${-cx}px, ${-cy}px)` }}
        />
      </div>
    </div>
  );
};

export const ShotScene: React.FC<{ chapter: string; shot: Shot; title: string; text: string }> = ({ chapter, shot, title, text }) => {
  const { durationInFrames } = useVideoConfig();
  return (
    <Stage tone="light">
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", paddingLeft: 140 }}>
        <div style={{ width: 560 }}>
          <Eyebrow label={chapter} start={beatAt(0)} color={c.blue} width={60} />
          <div style={{ ...H1, marginTop: 24, fontSize: 70 }}>
            <Rich text={title} start={beatAt(0) + 6} gap={5} accent={c.blue} />
          </div>
          <div style={{ marginTop: 26, fontSize: 36, lineHeight: 1.3, color: c.text }}>
            <Rich text={text} start={beatAt(1) + 6} gap={4} accent={c.blue} />
          </div>
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 760, top: 140 }}>
        <Window shot={shot} width={1060} zoomAt={beatAt(3)} zoomDur={BEAT * 4} panFrom={beatAt(2)} panUntil={durationInFrames - 10} />
      </div>
    </Stage>
  );
};
