import type React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Shot } from "./Screen";
import { Screen } from "./Screen";
import { Typewriter, Words } from "./text";
import { c, clamp, ease, font, inOut, rise } from "./theme";

/* ───────── Fundo claro com manchas azuis a derivar ───────── */
export const Light: React.FC<{ children?: React.ReactNode; tint?: number }> = ({ children, tint = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [0, durationInFrames], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: tint ? c.bg2 : c.bg, fontFamily: font, color: c.ink, overflow: "hidden", textWrap: "balance" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px circle at ${78 - t * 12}% ${18 + t * 10}%, ${c.pale} 0%, transparent 60%), radial-gradient(700px circle at ${8 + t * 10}% ${92 - t * 8}%, rgba(188,220,254,0.7) 0%, transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(rgba(0,101,237,0.10) 1.5px, transparent 1.5px)",
          backgroundSize: "34px 34px",
          backgroundPosition: `${t * 34}px ${t * 17}px`,
          maskImage: "linear-gradient(180deg, transparent 0%, black 30%, black 70%, transparent 100%)",
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

const Tag: React.FC<{ children: React.ReactNode; start: number; color?: string }> = ({ children, start, color = c.brand }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", color, ...rise(frame, start, 16) }}>
      <div
        style={{
          height: 3,
          borderRadius: 2,
          backgroundColor: c.amber,
          width: interpolate(frame, [start, start + 16], [0, 36], { ...clamp, easing: ease }),
        }}
      />
      {children}
    </div>
  );
};

/* ───────── 1. Capa ───────── */
export const CoverScene: React.FC<{ eyebrow: string; title: string; support: string; backdrop: Shot }> = ({
  eyebrow,
  title,
  support,
  backdrop,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tis = title.split(" ")[1] ?? "";

  return (
    <Light>
      {/* Print do portal em perspectiva, a flutuar à direita */}
      <div
        style={{
          position: "absolute",
          left: 1090,
          top: 200,
          transform: `perspective(1800px) rotateY(${interpolate(frame, [0, 150], [-28, -18])}deg) rotateX(6deg)`,
          opacity: interpolate(frame, [0.5 * fps, 1.2 * fps], [0, 1], clamp),
          translate: interpolate(frame, [0.5 * fps, 1.6 * fps], ["160px 0px", "0px 0px"], { ...clamp, easing: ease }),
        }}
      >
        <Screen shot={backdrop} width={1000} start={0} />
      </div>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 160 }}>
        <Tag start={0.2 * fps}>{eyebrow}</Tag>
        <div style={{ marginTop: 26, fontSize: 230, fontWeight: 800, letterSpacing: -9, lineHeight: 1 }}>
          <Typewriter text={title.split(" ")[0] + " "} start={0.5 * fps} cps={7} caret={false} />
          <Typewriter text={tis} start={0.5 * fps + 18} cps={7} style={{ color: c.brand }} />
        </div>
        <div style={{ marginTop: 40, fontSize: 52, color: c.text, maxWidth: 820, lineHeight: 1.2 }}>
          <Words text={support} start={1.6 * fps} />
        </div>
      </AbsoluteFill>
    </Light>
  );
};

/* ───────── 2. O que é ───────── */
export const WhatIsScene: React.FC<{ eyebrow: string; headline: string; pillars: { name: string; who: string; text: string }[] }> = ({
  eyebrow,
  headline,
  pillars,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Light>
      <AbsoluteFill style={{ padding: "0 160px", justifyContent: "center" }}>
        <Tag start={0}>{eyebrow}</Tag>
        <div style={{ marginTop: 26, fontSize: 92, fontWeight: 700, letterSpacing: -3, lineHeight: 1.08, maxWidth: 1400 }}>
          <Words text={headline} start={8} gap={4} />
        </div>
        <div style={{ display: "flex", gap: 32, marginTop: 90 }}>
          {pillars.map((p, i) => {
            const s = 2.2 * fps + i * 12;
            const strong = i === 2;
            return (
              <div
                key={p.name}
                style={{
                  flex: 1,
                  padding: "40px 44px 46px",
                  borderRadius: 26,
                  backgroundColor: strong ? c.brand : c.white,
                  color: strong ? c.white : c.ink,
                  boxShadow: "0 24px 60px rgba(19,38,85,0.10)",
                  ...rise(frame, s, 70, 24),
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: strong ? c.pale : c.brand }}>{p.who}</div>
                <div style={{ fontSize: 62, fontWeight: 800, marginTop: 10, letterSpacing: -2 }}>{p.name}</div>
                <div style={{ fontSize: 30, lineHeight: 1.4, marginTop: 14, color: strong ? c.white : c.text }}>{p.text}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Light>
  );
};

/* ───────── 3. Capa de capítulo ───────── */
export const ChapterScene: React.FC<{ number: string; title: string; tagline: string; index: number; total: number; names: string[] }> = ({
  number,
  title,
  tagline,
  index,
  total,
  names,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Light tint={1}>
      {/* Número gigante a deslizar */}
      <div
        style={{
          position: "absolute",
          right: 60,
          bottom: -140,
          fontSize: 820,
          fontWeight: 800,
          letterSpacing: -50,
          lineHeight: 1,
          color: c.pale2,
          opacity: 0.55,
          translate: interpolate(frame, [0, 3 * fps], ["0px 120px", "0px 0px"], { ...clamp, easing: ease }),
        }}
      >
        {number}
      </div>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 160 }}>
        <Tag start={0}>Capítulo {number}</Tag>
        <div style={{ marginTop: 20, fontSize: 170, fontWeight: 800, letterSpacing: -7, lineHeight: 1 }}>
          <Typewriter text={title} start={8} cps={16} />
        </div>
        <div style={{ marginTop: 34, fontSize: 46, color: c.text, maxWidth: 1150, lineHeight: 1.25 }}>
          <Words text={tagline} start={8 + (title.length * 30) / 16 + 6} gap={4} />
        </div>
      </AbsoluteFill>
      {/* Índice de capítulos */}
      <div style={{ position: "absolute", left: 160, right: 160, bottom: 80, display: "flex", gap: 16 }}>
        {Array.from({ length: total }).map((_, i) => {
          const active = i === index;
          const fill = active ? interpolate(frame, [8, 40], [0, 100], { ...clamp, easing: ease }) : i < index ? 100 : 0;
          return (
            <div key={i} style={{ flex: 1, ...rise(frame, 4 + i * 2, 10) }}>
              <div style={{ height: 6, borderRadius: 3, backgroundColor: c.pale, overflow: "hidden" }}>
                <div style={{ height: 6, width: `${fill}%`, backgroundColor: active ? c.brand : c.pale2 }} />
              </div>
              <div style={{ marginTop: 12, fontSize: 20, fontWeight: 600, color: active ? c.brand : c.soft }}>{names[i]}</div>
            </div>
          );
        })}
      </div>
    </Light>
  );
};

/* ───────── 4. Tela inteira com câmera + legenda ───────── */
export const ShotScene: React.FC<{ chapter: string; shot: Shot; title: string; text: string }> = ({ chapter, shot, title, text }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const W = 1500;

  return (
    <Light>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 60 }}>
        <Screen
          shot={shot}
          width={W}
          start={0}
          zoomAt={Math.round(2.8 * fps)}
          zoomDur={Math.round(2.2 * fps)}
          maxZoom={1.75}
          panFrom={Math.round(1.2 * fps)}
          panUntil={durationInFrames - 10}
        />
      </AbsoluteFill>
      {/* Legenda */}
      <div
        style={{
          position: "absolute",
          left: 90,
          bottom: 70,
          width: 760,
          padding: "30px 38px 34px",
          borderRadius: 24,
          backgroundColor: "rgba(255,255,255,0.96)",
          boxShadow: "0 30px 70px rgba(19,38,85,0.22)",
          borderLeft: `8px solid ${c.brand}`,
          ...rise(frame, 0.6 * fps, 60, 22),
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: c.brand }}>{chapter}</div>
        <div style={{ marginTop: 8, fontSize: 54, fontWeight: 800, letterSpacing: -1.5 }}>
          <Typewriter text={title} start={0.9 * fps} cps={18} />
        </div>
        <div style={{ marginTop: 10, fontSize: 29, lineHeight: 1.35, color: c.text }}>
          <Words text={text} start={1.9 * fps} gap={4} />
        </div>
      </div>
    </Light>
  );
};

/* ───────── 5. Texto + tela ───────── */
export const SplitScene: React.FC<{ chapter: string; shot: Shot; card?: Shot; title: string; items: string[] }> = ({
  chapter,
  shot,
  card,
  title,
  items,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const tall = shot.ih / shot.iw > 1.1;

  return (
    <Light>
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", paddingLeft: 150, gap: 70 }}>
        <div style={{ width: 700 }}>
          <Tag start={0}>{chapter}</Tag>
          <div style={{ marginTop: 22, fontSize: 72, fontWeight: 800, letterSpacing: -2.5, lineHeight: 1.05, minHeight: 160 }}>
            <Typewriter text={title} start={8} cps={18} />
          </div>
          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 22 }}>
            {items.map((it, i) => {
              const s = 1.8 * fps + i * 20;
              return (
                <div key={it} style={{ display: "flex", gap: 20, alignItems: "center", ...rise(frame, s, 24, 16) }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      minWidth: 40,
                      borderRadius: 12,
                      backgroundColor: c.pale,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      scale: String(interpolate(frame, [s, s + 12], [0.4, 1], { ...clamp, easing: Easing.spring({ damping: 9 }) })),
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.brand} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path
                        d="M5 12l5 5L20 7"
                        strokeDasharray="24"
                        strokeDashoffset={interpolate(frame, [s + 4, s + 16], [24, 0], clamp)}
                      />
                    </svg>
                  </div>
                  <div style={{ fontSize: 34, color: c.text, lineHeight: 1.3 }}>{it}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ position: "relative", flex: 1, height: 900, display: "flex", alignItems: "center" }}>
          {tall ? (
            // Prints compridos: janela estreita e alta, com pan
            <Screen shot={shot} width={760} ratio={1.08} start={4} panFrom={Math.round(1.2 * fps)} panUntil={durationInFrames - 10} tilt="right" style={{ marginLeft: 140 }} />
          ) : (
            <Screen shot={shot} width={960} start={4} panFrom={Math.round(1.2 * fps)} panUntil={durationInFrames - 10} tilt="right" />
          )}
          {card ? (
            <div
              style={{
                position: "absolute",
                left: -40,
                bottom: 40,
                width: 400,
                borderRadius: 22,
                overflow: "hidden",
                backgroundColor: c.white,
                boxShadow: "0 40px 90px rgba(19,38,85,0.28)",
                scale: String(interpolate(frame, [1 * fps, 1.6 * fps], [0.6, 1], { ...clamp, easing: Easing.spring({ damping: 12 }) })),
                opacity: interpolate(frame, [1 * fps, 1.2 * fps], [0, 1], clamp),
                rotate: `${interpolate(frame, [1 * fps, durationInFrames], [-4, -1], clamp)}deg`,
              }}
            >
              <Img src={staticFile(card.src)} style={{ width: "100%", display: "block" }} />
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </Light>
  );
};

/* ───────── 6. Segurança ───────── */
export const SecurityScene: React.FC<{ eyebrow: string; title: string; note: string; points: string[] }> = ({ eyebrow, title, note, points }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Light>
      <AbsoluteFill style={{ padding: "0 160px", justifyContent: "center" }}>
        <Tag start={0}>{eyebrow}</Tag>
        <div style={{ marginTop: 20, fontSize: 110, fontWeight: 800, letterSpacing: -4 }}>
          <Typewriter text={title} start={8} cps={16} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 26, marginTop: 60 }}>
          {points.map((p, i) => {
            const s = 1.8 * fps + i * 9;
            return (
              <div
                key={p}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  padding: "30px 34px",
                  borderRadius: 22,
                  backgroundColor: c.white,
                  boxShadow: "0 18px 50px rgba(19,38,85,0.09)",
                  ...rise(frame, s, 50, 20),
                }}
              >
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={c.brand} strokeWidth="2" strokeLinejoin="round" style={{ minWidth: 46 }}>
                  <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" fill={c.pale} />
                  <path d="M8.5 12l2.5 2.5 4.5-5" strokeLinecap="round" strokeDasharray="12" strokeDashoffset={interpolate(frame, [s + 6, s + 18], [12, 0], clamp)} />
                </svg>
                <div style={{ fontSize: 32, fontWeight: 600 }}>{p}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 56, fontSize: 34, color: c.text }}>
          <Words text={note} start={3.2 * fps} gap={4} />
        </div>
      </AbsoluteFill>
    </Light>
  );
};

/* ───────── 7. Plataforma ───────── */
export const PlatformScene: React.FC<{ eyebrow: string; title: string; tech: string[]; line: string }> = ({ eyebrow, title, tech, line }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Light tint={1}>
      <AbsoluteFill style={{ padding: "0 160px", justifyContent: "center" }}>
        <Tag start={0}>{eyebrow}</Tag>
        <div style={{ marginTop: 20, fontSize: 110, fontWeight: 800, letterSpacing: -4 }}>
          <Typewriter text={title} start={8} cps={16} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 50 }}>
          {tech.map((t, i) => {
            const s = 1.5 * fps + i * 7;
            return (
              <div
                key={t}
                style={{
                  padding: "18px 34px",
                  borderRadius: 999,
                  backgroundColor: c.white,
                  border: `2px solid ${c.pale2}`,
                  fontSize: 34,
                  fontWeight: 700,
                  color: c.ink,
                  opacity: interpolate(frame, [s, s + 6], [0, 1], clamp),
                  scale: String(interpolate(frame, [s, s + 14], [0.5, 1], { ...clamp, easing: Easing.spring({ damping: 10 }) })),
                }}
              >
                {t}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 70, fontSize: 56, fontWeight: 600, lineHeight: 1.2, maxWidth: 1400 }}>
          <Words text={line} start={2.8 * fps} gap={4} />
        </div>
      </AbsoluteFill>
    </Light>
  );
};

/* ───────── 8. Fecho ───────── */
export const ClosingScene: React.FC<{ title: string; line: string; footer: string }> = ({ title, line, footer }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [cms, tis] = title.split(" ");
  return (
    <Light>
      <AbsoluteFill
        style={{
          backgroundColor: c.brand,
          clipPath: `circle(${interpolate(frame, [0, 1 * fps], [0, 130], { ...clamp, easing: inOut })}% at 50% 50%)`,
        }}
      />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", color: c.white }}>
        <div style={{ fontSize: 230, fontWeight: 800, letterSpacing: -9, lineHeight: 1 }}>
          <Typewriter text={cms + " "} start={0.7 * fps} cps={8} caret={false} />
          <Typewriter text={tis} start={0.7 * fps + 15} cps={8} caretColor={c.white} style={{ color: c.pale }} />
        </div>
        <div style={{ marginTop: 44, fontSize: 48 }}>
          <Words text={line} start={2 * fps} gap={4} />
        </div>
        <div style={{ position: "absolute", bottom: 80, fontSize: 28, fontWeight: 600, letterSpacing: 10, color: c.pale, ...rise(frame, 2.4 * fps, 16) }}>
          {footer}
        </div>
      </AbsoluteFill>
    </Light>
  );
};

/* ───────── Pessoas: mosaico de fotos com Ken Burns ───────── */
export const PeopleScene: React.FC<{ eyebrow: string; title: string; line: string; photos: string[] }> = ({ eyebrow, title, line, photos }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // posições do mosaico (até 4 fotos)
  const slots = [
    { left: 0, top: 0, width: 620, height: 820 },
    { left: 650, top: 0, width: 420, height: 395 },
    { left: 650, top: 425, width: 420, height: 395 },
    { left: 1100, top: 120, width: 0, height: 0 },
  ];
  return (
    <Light>
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", paddingLeft: 150, gap: 80 }}>
        <div style={{ width: 620 }}>
          <Tag start={0}>{eyebrow}</Tag>
          <div style={{ marginTop: 22, fontSize: 84, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05 }}>
            <Typewriter text={title} start={8} cps={16} />
          </div>
          <div style={{ marginTop: 40, fontSize: 40, color: c.text, lineHeight: 1.3 }}>
            <Words text={line} start={2.6 * fps} gap={4} />
          </div>
        </div>
        <div style={{ position: "relative", width: 1070, height: 820 }}>
          {photos.slice(0, 3).map((p, i) => {
            const sl = slots[i];
            const s = 0.4 * fps + i * 10;
            const reveal = interpolate(frame, [s, s + 30], [100, 0], { ...clamp, easing: inOut });
            return (
              <div
                key={p}
                style={{
                  position: "absolute",
                  ...sl,
                  borderRadius: 28,
                  overflow: "hidden",
                  boxShadow: "0 30px 70px rgba(19,38,85,0.18)",
                  clipPath: `inset(${i === 0 ? reveal : 0}% 0% ${i === 0 ? 0 : reveal}% 0% round 28px)`,
                }}
              >
                <Img
                  src={staticFile(p)}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    // Ken Burns: zoom lento e leve deslocamento
                    scale: String(interpolate(frame, [s, durationInFrames], [1.18, 1.04], clamp)),
                    translate: interpolate(frame, [s, durationInFrames], [i % 2 ? "-20px 0px" : "20px 0px", "0px 0px"], clamp),
                  }}
                />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Light>
  );
};
