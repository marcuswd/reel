import type React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Group, TechItem } from "./content";
import { c, clamp, ease, rise } from "./theme";
import { Backdrop, BrowserFrame, Eyebrow, Rule } from "./ui";

/* ───────────── 1. Capa ───────────── */
export const CoverScene: React.FC<{ eyebrow: string; title: string; support: string }> = ({
  eyebrow,
  title,
  support,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [cms, tis] = title.split(" ");

  return (
    <Backdrop>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 180 }}>
        <Eyebrow style={rise(frame, 0.2 * fps)}>{eyebrow}</Eyebrow>
        <div style={{ display: "flex", gap: 40, marginTop: 30, fontSize: 260, fontWeight: 800, letterSpacing: -10, lineHeight: 1 }}>
          <span style={{ ...rise(frame, 0.4 * fps, 120, 26) }}>{cms}</span>
          <span style={{ ...rise(frame, 0.6 * fps, 120, 26), color: c.sky }}>{tis}</span>
        </div>
        <div style={{ marginTop: 40 }}>
          <Rule start={1.1 * fps} width={280} />
        </div>
        <div style={{ marginTop: 40, fontSize: 52, fontWeight: 400, color: c.pale, maxWidth: 1100, ...rise(frame, 1.3 * fps) }}>
          {support}
        </div>
      </AbsoluteFill>

      {/* Anel decorativo a rodar devagar */}
      <div
        style={{
          position: "absolute",
          right: -260,
          top: 140,
          width: 900,
          height: 900,
          borderRadius: "50%",
          border: `2px solid ${c.line}`,
          opacity: interpolate(frame, [0, fps], [0, 1], clamp),
          scale: interpolate(frame, [0, 1.5 * fps], [0.8, 1], { ...clamp, easing: ease }),
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 120,
            borderRadius: "50%",
            border: `2px dashed rgba(86,167,250,0.35)`,
            rotate: `${interpolate(frame, [0, 10 * fps], [0, 90])}deg`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: -10,
            width: 20,
            height: 20,
            borderRadius: 99,
            backgroundColor: c.amber,
            transformOrigin: "0px 460px",
            rotate: `${interpolate(frame, [0, 10 * fps], [-20, 60])}deg`,
          }}
        />
      </div>
    </Backdrop>
  );
};

/* ───────────── 2. O que é ───────────── */
export const WhatIsScene: React.FC<{
  eyebrow: string;
  headline: string;
  pillars: { name: string; who: string; text: string }[];
}> = ({ eyebrow, headline, pillars }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Backdrop>
      <AbsoluteFill style={{ padding: "140px 160px", justifyContent: "center" }}>
        <Eyebrow style={rise(frame, 0)}>{eyebrow}</Eyebrow>
        <div style={{ marginTop: 28, fontSize: 88, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05, maxWidth: 1400, ...rise(frame, 0.2 * fps, 60) }}>
          {headline}
        </div>
        <div style={{ display: "flex", gap: 36, marginTop: 90 }}>
          {pillars.map((p, i) => {
            const s = 0.9 * fps + i * 8;
            return (
              <div
                key={p.name}
                style={{
                  flex: 1,
                  padding: "44px 44px 48px",
                  borderRadius: 24,
                  backgroundColor: i === 2 ? c.brand : "rgba(255,255,255,0.05)",
                  border: `1px solid ${i === 2 ? c.sky : c.line}`,
                  ...rise(frame, s, 80, 24),
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: i === 2 ? c.pale : c.sky }}>
                  {p.who}
                </div>
                <div style={{ fontSize: 64, fontWeight: 800, marginTop: 14, letterSpacing: -2 }}>{p.name}</div>
                <div style={{ fontSize: 30, lineHeight: 1.4, marginTop: 16, color: i === 2 ? c.white : c.pale }}>{p.text}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};

/* ───────────── 3. Três telas a passar ───────────── */
export const ScreensScene: React.FC<{ screens: { image: string; caption: string }[] }> = ({ screens }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const per = durationInFrames / screens.length;
  const W = 1280;
  const H = 820;
  const gap = 140;

  // Carrossel: segura em cada tela e desliza para a próxima com mola
  const keys = screens.map((_, i) => i * per);
  let offset = 0;
  for (let i = 1; i < screens.length; i++) {
    offset += interpolate(frame, [keys[i] - 0.6 * fps, keys[i]], [0, 1], {
      ...clamp,
      easing: Easing.bezier(0.65, 0, 0.35, 1),
    });
  }

  return (
    <Backdrop>
      <AbsoluteFill style={{ justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            gap,
            paddingLeft: (1920 - W) / 2,
            translate: `${-offset * (W + gap)}px 0px`,
            opacity: interpolate(frame, [0, 10], [0, 1], clamp),
          }}
        >
          {screens.map((s, i) => {
            const dist = Math.abs(offset - i);
            return (
              <div
                key={s.image}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  scale: String(interpolate(dist, [0, 1], [1, 0.86], clamp)),
                  opacity: interpolate(dist, [0, 1], [1, 0.35], clamp),
                }}
              >
                <BrowserFrame src={s.image} width={W} height={H} />
                <div style={{ marginTop: 44, fontSize: 40, fontWeight: 600, display: "flex", alignItems: "center", gap: 18 }}>
                  <span style={{ color: c.amber, fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</span>
                  {s.caption}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};

/* ───────────── 4. Capa de grupo ───────────── */
export const GroupCoverScene: React.FC<{ number: string; title: string; tagline: string }> = ({
  number,
  title,
  tagline,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Backdrop tone="brand">
      {/* Número gigante em contorno */}
      <div
        style={{
          position: "absolute",
          right: 80,
          bottom: -120,
          fontSize: 760,
          fontWeight: 800,
          letterSpacing: -40,
          color: "transparent",
          WebkitTextStroke: "3px rgba(255,255,255,0.28)",
          lineHeight: 1,
          translate: interpolate(frame, [0, 2.5 * fps], ["0px 80px", "0px 0px"], { ...clamp, easing: ease }),
          opacity: interpolate(frame, [0, 12], [0, 1], clamp),
        }}
      >
        {number}
      </div>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 180 }}>
        <Eyebrow color={c.white} style={rise(frame, 0.1 * fps)}>
          Parte {number}
        </Eyebrow>
        <div style={{ marginTop: 24, fontSize: 200, fontWeight: 800, letterSpacing: -8, lineHeight: 1, ...rise(frame, 0.25 * fps, 100, 24) }}>
          {title}
        </div>
        <div style={{ marginTop: 36, fontSize: 48, color: c.pale, maxWidth: 1050, lineHeight: 1.25, ...rise(frame, 0.6 * fps) }}>
          {tagline}
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};

/* ───────────── 5. Tecnologias do grupo ───────────── */
export const TechScene: React.FC<{ group: Pick<Group, "number" | "title">; items: TechItem[] }> = ({ group, items }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cols = items.length > 4 ? 3 : 2;

  return (
    <Backdrop>
      <AbsoluteFill style={{ padding: "120px 160px", justifyContent: "center" }}>
        <Eyebrow style={rise(frame, 0)}>
          {group.number} · {group.title}
        </Eyebrow>
        <div style={{ marginTop: 22, fontSize: 76, fontWeight: 700, letterSpacing: -2, ...rise(frame, 0.15 * fps, 50) }}>
          Com o que é feito, e para quê
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 28, marginTop: 70 }}>
          {items.map((t, i) => {
            const s = 0.6 * fps + i * 5;
            return (
              <div
                key={t.name}
                style={{
                  padding: "36px 40px",
                  borderRadius: 22,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: `1px solid ${c.line}`,
                  borderLeft: `6px solid ${c.brand}`,
                  ...rise(frame, s, 60, 22),
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                  <span style={{ fontSize: 46, fontWeight: 700, letterSpacing: -1 }}>{t.name}</span>
                  {t.version ? <span style={{ fontSize: 26, fontWeight: 600, color: c.amber }}>{t.version}</span> : null}
                </div>
                <div style={{ fontSize: 28, lineHeight: 1.35, marginTop: 12, color: c.pale }}>{t.desc}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};

/* ───────────── 6. Funcionalidades com prints ───────────── */
export const FeatureScene: React.FC<{
  group: Pick<Group, "number" | "title">;
  title: string;
  items: string[];
  image?: string;
  image2?: string;
  diagram?: boolean;
}> = ({ group, title, items, image, image2, diagram }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const wide = !image && !diagram;

  return (
    <Backdrop>
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 120px 0 160px", gap: 80 }}>
        <div style={{ flex: wide ? 1 : "0 0 720px" }}>
          <Eyebrow style={rise(frame, 0)}>
            {group.number} · {group.title}
          </Eyebrow>
          <div style={{ marginTop: 22, fontSize: 64, fontWeight: 700, letterSpacing: -2, lineHeight: 1.08, ...rise(frame, 0.15 * fps, 50) }}>
            {title}
          </div>
          <div style={{ marginTop: 50, display: "flex", flexDirection: "column", gap: 24 }}>
            {items.map((it, i) => {
              const s = 0.6 * fps + i * 9;
              return (
                <div key={it} style={{ display: "flex", gap: 22, alignItems: "flex-start", ...rise(frame, s, 30, 18) }}>
                  <div
                    style={{
                      marginTop: 12,
                      width: 16,
                      height: 16,
                      minWidth: 16,
                      borderRadius: 5,
                      backgroundColor: c.amber,
                      scale: String(interpolate(frame, [s, s + 10], [0, 1], { ...clamp, easing: Easing.spring({ damping: 10 }) })),
                    }}
                  />
                  <div style={{ fontSize: 32, lineHeight: 1.35, color: c.pale }}>{it}</div>
                </div>
              );
            })}
          </div>
        </div>

        {image ? (
          <div style={{ flex: 1, position: "relative", height: 820 }}>
            <BrowserFrame
              src={image}
              width={image2 ? 820 : 900}
              height={image2 ? 560 : 600}
              style={{
                position: "absolute",
                left: 0,
                top: image2 ? 0 : 110,
                ...rise(frame, 0.3 * fps, 80, 26),
                rotate: `${interpolate(frame, [0, durationInFrames], [-1.5, 0])}deg`,
              }}
            />
            {image2 ? (
              <BrowserFrame
                src={image2}
                width={640}
                height={440}
                pan={image2.includes("newsletter-email") ? interpolate(frame, [fps, durationInFrames], [0, 0.55], clamp) : 0}
                style={{
                  position: "absolute",
                  right: -40,
                  bottom: 0,
                  ...rise(frame, 0.9 * fps, 120, 28),
                }}
              />
            ) : null}
          </div>
        ) : null}

        {diagram ? <ArchDiagram /> : null}
      </AbsoluteFill>
    </Backdrop>
  );
};

/* Diagrama animado: portal e painel falam só com o motor */
const ArchDiagram: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const box = (label: string, sub: string | null, s: number, strong = false): React.CSSProperties & { label: string; sub: string | null } => ({
    label,
    sub,
    ...rise(frame, s, 40, 20),
    padding: strong ? "0 30px" : "0 26px",
    borderRadius: 18,
    backgroundColor: strong ? c.brand : "rgba(255,255,255,0.06)",
    border: `2px solid ${strong ? c.sky : c.line}`,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  });

  const line = (s: number, w: number) => (
    <div style={{ width: w, height: 3, display: "flex", alignItems: "center" }}>
      <div
        style={{
          height: 3,
          backgroundColor: c.sky,
          width: interpolate(frame, [s, s + 14], [0, w], { ...clamp, easing: ease }),
        }}
      />
    </div>
  );

  const left = [box("Portal", "colaboradores", 0.5 * fps), box("Painel", "quem gere", 0.65 * fps)];
  const right = [box("PostgreSQL", null, 1.6 * fps), box("Ficheiros", null, 1.7 * fps), box("Correio SMTP", null, 1.8 * fps)];
  const motor = box("Motor (API)", "permissões e âmbito", 1.0 * fps, true);

  const Label: React.FC<{ b: ReturnType<typeof box>; size: number }> = ({ b, size }) => {
    const { label, sub, ...style } = b;
    return (
      <div style={style}>
        <div style={{ fontSize: size, fontWeight: 700 }}>{label}</div>
        {sub ? <div style={{ fontSize: 22, color: c.pale, marginTop: 4 }}>{sub}</div> : null}
      </div>
    );
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 60 }}>
          {left.map((b) => (
            <div key={b.label} style={{ display: "flex", alignItems: "center" }}>
              <Label b={{ ...b, width: 240, height: 120 }} size={36} />
              {line(0.85 * fps, 60)}
            </div>
          ))}
        </div>
        <Label b={{ ...motor, width: 280, height: 300 }} size={38} />
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          {right.map((b) => (
            <div key={b.label} style={{ display: "flex", alignItems: "center" }}>
              {line(1.4 * fps, 60)}
              <Label b={{ ...b, width: 280, height: 80, whiteSpace: "nowrap" }} size={28} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 26, color: c.muted, textAlign: "center", maxWidth: 780, ...rise(frame, 2.2 * fps) }}>
        O portal e o painel nunca vão à base de dados: pedem tudo ao motor.
      </div>
    </div>
  );
};

/* ───────────── 7. Fecho ───────────── */
export const ClosingScene: React.FC<{ title: string; line: string; footer: string }> = ({ title, line, footer }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [cms, tis] = title.split(" ");

  return (
    <Backdrop>
      <AbsoluteFill
        style={{
          backgroundColor: c.brand,
          clipPath: `circle(${interpolate(frame, [0, 1 * fps], [0, 130], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) })}% at 50% 50%)`,
        }}
      />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div
          style={{
            display: "flex",
            gap: 32,
            fontSize: 220,
            fontWeight: 800,
            letterSpacing: -8,
            lineHeight: 1,
            scale: String(interpolate(frame, [0.5 * fps, 1.4 * fps], [0.85, 1], { ...clamp, easing: Easing.spring({ damping: 14 }) })),
            opacity: interpolate(frame, [0.5 * fps, 0.8 * fps], [0, 1], clamp),
          }}
        >
          <span>{cms}</span>
          <span style={{ color: c.ink }}>{tis}</span>
        </div>
        <div style={{ marginTop: 50, fontSize: 44, lineHeight: 1.3, maxWidth: 1200, color: c.white, ...rise(frame, 1.3 * fps) }}>
          {line}
        </div>
        <div style={{ position: "absolute", bottom: 80, fontSize: 28, fontWeight: 600, letterSpacing: 8, color: c.pale, ...rise(frame, 1.8 * fps, 20) }}>
          {footer}
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
