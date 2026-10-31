import type React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { c, clamp, ease, font, rise } from "./theme";

/** Logo da TIS (versão branca para fundos escuros, navy para fundos claros). */
export const Logo: React.FC<{ height: number; tone?: "white" | "navy"; style?: React.CSSProperties }> = ({ height, tone = "white", style }) => (
  <Img
    src={staticFile(tone === "white" ? "cms/brand/tis-logo-branca.svg" : "cms/brand/tis-logo.svg")}
    style={{ height, width: (height * 112) / 50, ...style }}
  />
);

/** O símbolo da TIS, grande e desfocado, a derivar no fundo (como no site). */
export const MarkGlow: React.FC<{ x: number; y: number; size: number; opacity?: number }> = ({ x, y, size, opacity = 0.35 }) => {
  const frame = useCurrentFrame();
  return (
    <Img
      src={staticFile("cms/brand/tis-mark.svg")}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        opacity,
        filter: "blur(14px)",
        translate: `${Math.sin(frame / 60) * 12}px ${Math.cos(frame / 70) * 10}px`,
      }}
    />
  );
};

/** Fundo escuro da marca (navy) ou claro (#F1F6FB), sempre com a logo num canto. */
export const Stage: React.FC<{ tone: "dark" | "light"; children?: React.ReactNode; logo?: boolean; glow?: boolean; logoOnPhoto?: boolean }> = ({
  tone,
  children,
  logo = true,
  glow = true,
  logoOnPhoto = false,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [0, durationInFrames], [0, 1], clamp);
  const dark = tone === "dark";
  const lightLogo = dark || logoOnPhoto;
  return (
    <AbsoluteFill style={{ backgroundColor: dark ? c.navy : c.light, fontFamily: font, color: dark ? c.white : c.ink, overflow: "hidden", textWrap: "balance" }}>
      <AbsoluteFill
        style={{
          background: dark
            ? `radial-gradient(1100px circle at ${85 - t * 10}% ${20 + t * 10}%, rgba(3,110,242,0.35) 0%, transparent 60%), linear-gradient(180deg, ${c.navy} 0%, ${c.navyDeep} 100%)`
            : `radial-gradient(900px circle at ${82 - t * 10}% ${12 + t * 8}%, rgba(0,170,255,0.14) 0%, transparent 60%), radial-gradient(800px circle at 5% 95%, rgba(3,110,242,0.08) 0%, transparent 60%)`,
        }}
      />
      {glow ? <MarkGlow x={dark ? -120 : 1580} y={dark ? 600 : -140} size={520} opacity={dark ? 0.28 : 0.08} /> : null}
      {children}
      {logo ? (
        <div style={{ position: "absolute", right: 80, bottom: 60, display: "flex", alignItems: "center", gap: 18, opacity: interpolate(frame, [10, 25], [0, 1], clamp) }}>
          <span style={{ fontSize: 18, letterSpacing: 3, color: lightLogo ? c.white : c.text }}>tis.ao</span>
          <div style={{ width: 1, height: 26, backgroundColor: lightLogo ? "rgba(255,255,255,0.5)" : c.line }} />
          <Logo height={30} tone={lightLogo ? "white" : "navy"} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Foto com Ken Burns e véu navy, para unificar o tom das imagens de banco. */
export const Photo: React.FC<{ src: string; start?: number; style?: React.CSSProperties; veil?: number; focus?: string; zoom?: [number, number] }> = ({
  src,
  start = 0,
  style,
  veil = 0.25,
  focus = "50% 40%",
  zoom = [1.16, 1.03],
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div style={{ position: "absolute", overflow: "hidden", backgroundColor: c.navy, ...style }}>
      <Img
        src={staticFile(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: focus,
          scale: String(interpolate(frame, [start, durationInFrames], zoom, clamp)),
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(4,22,93,${veil * 0.4}) 0%, rgba(4,22,93,${veil}) 100%)`, mixBlendMode: "multiply" }} />
    </div>
  );
};

/** Botão do site: rectângulo branco, texto azul e a seta ●─● */
export const Button: React.FC<{ label: string; start: number }> = ({ label, start }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 18,
        padding: "22px 40px",
        backgroundColor: c.white,
        color: c.blue,
        fontSize: 30,
        fontWeight: 500,
        ...rise(frame, start, 20),
      }}
    >
      {label}
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ width: 6, height: 6, borderRadius: 9, backgroundColor: c.blue }} />
        <div style={{ width: interpolate(frame, [start + 8, start + 22], [0, 22], { ...clamp, easing: ease }), height: 2, backgroundColor: c.blue }} />
        <div style={{ width: 6, height: 6, borderRadius: 9, backgroundColor: c.blue }} />
      </div>
    </div>
  );
};
