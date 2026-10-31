import type React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Button, Logo, Photo, Stage } from "./brand";
import type { Shot } from "./Screen";
import { Screen } from "./Screen";
import { Eyebrow, Rich, Typewriter, richFrames, typingFrames } from "./text";
import { c, clamp, ease, inOut, rise } from "./theme";

const H1: React.CSSProperties = { fontWeight: 400, letterSpacing: "-0.04em", lineHeight: 1.02 };

/** Marcador de lista no estilo do site: ●── */
const Bullet: React.FC<{ start: number; color?: string }> = ({ start, color = c.blue }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", alignItems: "center", minWidth: 46, marginTop: 4 }}>
      <div style={{ width: 9, height: 9, borderRadius: 9, backgroundColor: color, scale: String(interpolate(frame, [start, start + 8], [0, 1], clamp)) }} />
      <div style={{ height: 2, backgroundColor: color, width: interpolate(frame, [start + 4, start + 16], [0, 30], { ...clamp, easing: ease }) }} />
    </div>
  );
};

/* ───────── 1. Capa (estilo hero do site) ───────── */
export const CoverScene: React.FC<{ eyebrow: string; title: string; support: string; photo: string }> = ({ eyebrow, title, support, photo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [cms, tis] = title.split(" ");
  const t1 = Math.round(0.9 * fps);
  const t2 = t1 + typingFrames(cms + " ", 9) + 4;
  return (
    <Stage tone="dark" logo={false} glow={false}>
      <Photo src={photo} style={{ left: 760, top: 0, width: 1160, height: 1080 }} veil={0.35} focus="50% 30%" />
      <AbsoluteFill style={{ background: `linear-gradient(90deg, ${c.navy} 38%, rgba(4,22,93,0.55) 62%, rgba(4,22,93,0.1) 100%)` }} />
      <div style={{ position: "absolute", left: 140, top: 90, ...rise(frame, 4, 20) }}>
        <Logo height={58} />
      </div>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 140 }}>
        <Eyebrow label={eyebrow} start={Math.round(0.5 * fps)} />
        <div style={{ ...H1, marginTop: 30, fontSize: 250 }}>
          <Typewriter text={cms + " "} start={t1} cps={9} />
          <Typewriter text={tis} start={t2} cps={9} style={{ color: c.cyan }} />
        </div>
        <div style={{ marginTop: 34, fontSize: 52, fontWeight: 300, maxWidth: 820, lineHeight: 1.2 }}>
          <Rich text={support} start={t2 + typingFrames(tis, 9) + 6} gap={5} />
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

/* ───────── 2. O que é ───────── */
export const WhatIsScene: React.FC<{ eyebrow: string; headline: string; pillars: { name: string; text: string }[] }> = ({ eyebrow, headline, pillars }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = [c.cyan, c.blue, c.purple];
  const cardsAt = 10 + richFrames(headline, 5);
  return (
    <Stage tone="light">
      <AbsoluteFill style={{ padding: "0 140px", justifyContent: "center" }}>
        <Eyebrow label={eyebrow} start={0} color={c.blue} />
        <div style={{ ...H1, marginTop: 28, fontSize: 96, maxWidth: 1300 }}>
          <Rich text={headline} start={10} gap={5} accent={c.blue} />
        </div>
        <div style={{ display: "flex", marginTop: 80 }}>
          {pillars.map((p, i) => {
            const s = cardsAt + i * 10;
            const open = interpolate(frame, [s, s + 22], [100, 0], { ...clamp, easing: inOut });
            return (
              <div key={p.name} style={{ flex: 1, height: 300, backgroundColor: colors[i], color: c.white, padding: "52px 56px", clipPath: `inset(${open}% 0% 0% 0%)` }}>
                <div style={{ ...H1, fontSize: 66, ...rise(frame, s + 10, 24) }}>{p.name}</div>
                <div style={{ fontSize: 30, lineHeight: 1.35, marginTop: 18, maxWidth: 420, ...rise(frame, s + 16, 20) }}>{p.text}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

/* ───────── 3. Pessoas ───────── */
export const PeopleScene: React.FC<{ eyebrow: string; title: string; line: string; photos: string[] }> = ({ eyebrow, title, line, photos }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slots = [
    { left: 0, top: 0, width: 560, height: 860 },
    { left: 580, top: 0, width: 460, height: 420 },
    { left: 580, top: 440, width: 460, height: 420 },
  ];
  return (
    <Stage tone="dark">
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", paddingLeft: 140, gap: 90 }}>
        <div style={{ width: 640 }}>
          <Eyebrow label={eyebrow} start={0} />
          <div style={{ ...H1, marginTop: 28, fontSize: 84 }}>
            <Rich text={title} start={10} gap={5} />
          </div>
          <div style={{ marginTop: 36, fontSize: 38, fontWeight: 300, color: c.mist, lineHeight: 1.3 }}>
            <Rich text={line} start={10 + richFrames(title, 5)} gap={5} />
          </div>
        </div>
        <div style={{ position: "relative", width: 1040, height: 860 }}>
          {photos.slice(0, 3).map((p, i) => {
            const s = Math.round(0.3 * fps) + i * 9;
            const open = interpolate(frame, [s, s + 26], [100, 0], { ...clamp, easing: inOut });
            return (
              <div key={p} style={{ position: "absolute", ...slots[i], clipPath: i === 0 ? `inset(${open}% 0% 0% 0%)` : `inset(0% 0% 0% ${open}%)` }}>
                <Photo src={p} start={s} style={{ inset: 0 }} veil={0.18} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

/* ───────── 4. Capa de capítulo ───────── */
export const ChapterScene: React.FC<{ number: string; title: string; tagline: string; photo: string; index: number; names: string[] }> = ({
  number,
  title,
  tagline,
  photo,
  index,
  names,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const open = interpolate(frame, [4, 34], [100, 0], { ...clamp, easing: inOut });
  const typeAt = 12;
  return (
    <Stage tone="dark">
      <div style={{ position: "absolute", left: 1180, top: 0, width: 740, height: 1080, clipPath: `inset(0% 0% 0% ${open}%)` }}>
        <Photo src={photo} style={{ inset: 0 }} veil={0.2} />
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 10, backgroundColor: c.cyan }} />
      </div>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 140, width: 1080 }}>
        <Eyebrow label={`Capítulo ${number}`} start={2} />
        <div style={{ ...H1, marginTop: 26, fontSize: 150 }}>
          <Typewriter text={title} start={typeAt} cps={16} />
        </div>
        <div style={{ marginTop: 34, fontSize: 46, fontWeight: 300, color: c.mist, lineHeight: 1.25, maxWidth: 900 }}>
          <Rich text={tagline} start={typeAt + typingFrames(title, 16) + 6} gap={5} />
        </div>
      </AbsoluteFill>
      {/* índice de capítulos */}
      <div style={{ position: "absolute", left: 140, bottom: 70, display: "flex", gap: 28 }}>
        {names.map((n, i) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, letterSpacing: 2, textTransform: "uppercase", color: i === index ? c.cyan : "rgba(255,255,255,0.35)", ...rise(frame, 8 + i * 3, 10) }}>
            <div style={{ width: 8, height: 8, borderRadius: 9, backgroundColor: i === index ? c.cyan : "rgba(255,255,255,0.25)" }} />
            {n}
          </div>
        ))}
      </div>
    </Stage>
  );
};

/* ───────── 5. Tela com câmera + legenda ───────── */
export const ShotScene: React.FC<{ chapter: string; shot: Shot; title: string; text: string }> = ({ chapter, shot, title, text }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const textAt = Math.round(0.9 * fps);
  return (
    <Stage tone="light">
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-end", paddingRight: 110, paddingBottom: 40 }}>
        <Screen
          shot={shot}
          width={1380}
          start={0}
          zoomAt={Math.round(3.2 * fps)}
          zoomDur={Math.round(2.4 * fps)}
          maxZoom={1.6}
          panFrom={Math.round(1.4 * fps)}
          panUntil={durationInFrames - 10}
        />
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 90,
          bottom: 150,
          width: 700,
          padding: "36px 44px 40px",
          backgroundColor: c.white,
          borderTop: `6px solid ${c.blue}`,
          boxShadow: "0 30px 80px rgba(4,22,93,0.18)",
          clipPath: `inset(0% ${interpolate(frame, [textAt - 12, textAt + 10], [100, 0], { ...clamp, easing: inOut })}% 0% 0%)`,
        }}
      >
        <Eyebrow label={chapter} start={textAt} color={c.blue} width={60} />
        <div style={{ ...H1, marginTop: 18, fontSize: 58 }}>
          <Rich text={title} start={textAt + 8} gap={5} accent={c.blue} />
        </div>
        <div style={{ marginTop: 14, fontSize: 30, lineHeight: 1.35, color: c.text }}>
          <Rich text={text} start={textAt + 8 + richFrames(title, 5)} gap={5} accent={c.blue} />
        </div>
      </div>
    </Stage>
  );
};

/* ───────── 6. Texto + foto ou tela ───────── */
export const SplitScene: React.FC<{ chapter: string; title: string; items: string[]; shot?: Shot; photo?: string; card?: Shot }> = ({
  chapter,
  title,
  items,
  shot,
  photo,
  card,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const itemsAt = 8 + richFrames(title, 5) + 6;
  const open = interpolate(frame, [0, 30], [100, 0], { ...clamp, easing: inOut });
  return (
    <Stage tone="light" logoOnPhoto={Boolean(photo)}>
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", paddingLeft: 140 }}>
        <div style={{ width: 720 }}>
          <Eyebrow label={chapter} start={0} color={c.blue} width={60} />
          <div style={{ ...H1, marginTop: 26, fontSize: 76 }}>
            <Rich text={title} start={8} gap={5} accent={c.blue} />
          </div>
          <div style={{ marginTop: 46, display: "flex", flexDirection: "column", gap: 26 }}>
            {items.map((it, i) => {
              const s = itemsAt + i * 22;
              return (
                <div key={it} style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <Bullet start={s} />
                  <div style={{ fontSize: 36, color: c.text, lineHeight: 1.25 }}>
                    <Rich text={it} start={s + 6} gap={3} accent={c.blue} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
      {photo ? (
        <div style={{ position: "absolute", left: 1000, top: 0, width: 920, height: 1080, clipPath: `inset(0% 0% 0% ${open}%)` }}>
          <Photo src={photo} style={{ inset: 0 }} veil={0.15} />
        </div>
      ) : null}
      {shot ? (
        <div style={{ position: "absolute", left: 1040, top: 110 }}>
          <Screen shot={shot} width={720} ratio={1.08} start={4} panFrom={Math.round(1.6 * fps)} panUntil={durationInFrames - 10} />
        </div>
      ) : null}
      {card ? (
        <div
          style={{
            position: "absolute",
            left: 900,
            bottom: 120,
            width: card.ih > card.iw ? 400 : 560,
            backgroundColor: c.white,
            boxShadow: "0 40px 90px rgba(4,22,93,0.35)",
            borderTop: `6px solid ${c.cyan}`,
            overflow: "hidden",
            translate: interpolate(frame, [Math.round(0.9 * fps), Math.round(1.7 * fps)], ["0px 260px", "0px 0px"], { ...clamp, easing: Easing.bezier(0.2, 1.3, 0.4, 1) }),
            opacity: interpolate(frame, [Math.round(0.9 * fps), Math.round(1.2 * fps)], [0, 1], clamp),
            rotate: `${interpolate(frame, [Math.round(0.9 * fps), durationInFrames], [-5, -1.5], clamp)}deg`,
          }}
        >
          <Img src={staticFile(card.src)} style={{ width: "100%", display: "block" }} />
        </div>
      ) : null}
    </Stage>
  );
};

/* ───────── 7. Segurança (números como no site) ───────── */
export const SecurityScene: React.FC<{ eyebrow: string; title: string; stats: { n: number; suffix: string; label: string }[]; note: string }> = ({
  eyebrow,
  title,
  stats,
  note,
}) => {
  const frame = useCurrentFrame();
  const statsAt = 10 + richFrames(title, 5);
  return (
    <Stage tone="dark">
      <AbsoluteFill style={{ padding: "0 140px", justifyContent: "center" }}>
        <Eyebrow label={eyebrow} start={0} />
        <div style={{ ...H1, marginTop: 26, fontSize: 100 }}>
          <Rich text={title} start={10} gap={5} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, marginTop: 70 }}>
          {stats.map((s, i) => {
            const at = statsAt + i * 16;
            const val = Math.round(interpolate(frame, [at, at + 30], [0, s.n], { ...clamp, easing: ease }));
            return (
              <div key={s.label} style={{ padding: "0 40px 0 0", borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 30, ...rise(frame, at, 30) }}>
                <div style={{ fontSize: 120, fontWeight: 300, letterSpacing: "-0.04em", color: c.cyan, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {val}
                  {s.suffix}
                </div>
                <div style={{ fontSize: 28, marginTop: 14, lineHeight: 1.3, color: c.white }}>{s.label}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 60, fontSize: 32, fontWeight: 300, color: c.mist }}>
          <Rich text={note} start={statsAt + stats.length * 16 + 20} gap={4} />
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

/* ───────── 8. Plataforma ───────── */
export const PlatformScene: React.FC<{ eyebrow: string; title: string; tech: string[]; line: string }> = ({ eyebrow, title, tech, line }) => {
  const frame = useCurrentFrame();
  const techAt = 10 + richFrames(title, 5);
  return (
    <Stage tone="light">
      <AbsoluteFill style={{ padding: "0 140px", justifyContent: "center" }}>
        <Eyebrow label={eyebrow} start={0} color={c.blue} />
        <div style={{ ...H1, marginTop: 26, fontSize: 110 }}>
          <Rich text={title} start={10} gap={5} accent={c.blue} />
        </div>
        <div style={{ display: "flex", gap: 0, marginTop: 56 }}>
          {tech.map((t, i) => {
            const s = techAt + i * 6;
            return (
              <div
                key={t}
                style={{
                  padding: "22px 38px",
                  border: `1px solid ${c.line}`,
                  marginLeft: i ? -1 : 0,
                  backgroundColor: c.white,
                  fontSize: 32,
                  color: c.ink,
                  ...rise(frame, s, 30, 16),
                }}
              >
                {t}
              </div>
            );
          })}
        </div>
        <div style={{ ...H1, marginTop: 70, fontSize: 56, lineHeight: 1.15, maxWidth: 1300 }}>
          <Rich text={line} start={techAt + tech.length * 6 + 14} gap={5} accent={c.blue} />
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

/* ───────── 9. Fecho ───────── */
export const ClosingScene: React.FC<{ title: string; line: string; cta: string }> = ({ title, line, cta }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [cms, tis] = title.split(" ");
  return (
    <Stage tone="dark" logo={false}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div style={{ ...rise(frame, 4, 30), scale: String(interpolate(frame, [4, 40], [0.85, 1], { ...clamp, easing: ease })) }}>
          <Logo height={110} />
        </div>
        <div style={{ ...H1, marginTop: 50, fontSize: 150 }}>
          <Rich text={`${cms} [${tis}]`} start={Math.round(0.8 * fps)} gap={6} />
        </div>
        <div style={{ marginTop: 26, fontSize: 46, fontWeight: 300, color: c.mist }}>
          <Rich text={line} start={Math.round(1.4 * fps)} gap={5} />
        </div>
        <div style={{ marginTop: 56 }}>
          <Button label={cta} start={Math.round(2.6 * fps)} />
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
