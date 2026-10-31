import React from "react";
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { c, clamp, title as titleFont } from "./theme";

/** Mola padrão das entradas (divertida, com um leve overshoot). */
export const usePop = (start: number, damping = 11, mass = 0.7) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - start, fps, config: { damping, mass, stiffness: 140 } });
};

/** Bolinha de açaí com brilho. */
export const Berry: React.FC<{ size: number; style?: React.CSSProperties; tone?: string }> = ({ size, style, tone = c.berry }) => (
  <div
    style={{
      position: "absolute",
      width: size,
      height: size,
      borderRadius: "50%",
      background: `radial-gradient(circle at 32% 30%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 18%), radial-gradient(circle at 50% 55%, ${tone} 0%, #1c0d26 100%)`,
      boxShadow: `0 ${size * 0.08}px ${size * 0.25}px rgba(0,0,0,0.35)`,
      ...style,
    }}
  />
);

/** Fundo com gradiente e bolinhas de açaí flutuando (determinístico). */
export const Bg: React.FC<{ from: string; to: string; berries?: number; seed?: string; berryTone?: string; opacity?: number }> = ({
  from,
  to,
  berries = 10,
  seed = "bg",
  berryTone,
  opacity = 0.55,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)`, overflow: "hidden" }}>
      {new Array(berries).fill(0).map((_, i) => {
        const r = (k: string) => random(`${seed}-${i}-${k}`);
        const size = 40 + r("s") * 140;
        const x = r("x") * 1080 - size / 2;
        const y0 = r("y") * 2100 - 100;
        const speed = 0.4 + r("v") * 1.1;
        const y = ((y0 - frame * speed + 2200) % 2200) - 150;
        const sway = Math.sin((frame + r("p") * 200) / 30) * 14;
        return <Berry key={i} size={size} tone={berryTone} style={{ left: x + sway, top: y, opacity: opacity * (0.5 + r("o") * 0.5), filter: size < 80 ? "blur(3px)" : undefined }} />;
      })}
    </AbsoluteFill>
  );
};

type Seg = { word: string; hl: boolean };
const parse = (text: string): Seg[] => {
  const out: Seg[] = [];
  const re = /\[([^\]]+)\]|([^\s[\]]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[1]) m[1].split(/\s+/).forEach((w) => out.push({ word: w, hl: true }));
    else out.push({ word: m[2], hl: false });
  }
  return out;
};

/** Texto palavra a palavra com mola; [colchetes] ganham a cor de destaque. */
export const Words: React.FC<{
  text: string;
  start: number;
  size: number;
  color?: string;
  hl?: string;
  stagger?: number;
  weight?: number;
  font?: string;
  align?: "center" | "left";
  lineHeight?: number;
  style?: React.CSSProperties;
}> = ({ text, start, size, color = c.white, hl = c.orange, stagger = 3, weight = 900, font = titleFont, align = "center", lineHeight = 1.08, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const segs = parse(text);
  return (
    <div
      style={{
        fontFamily: font,
        fontWeight: weight,
        fontSize: size,
        lineHeight,
        color,
        textAlign: align,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        columnGap: size * 0.26,
        letterSpacing: -size * 0.012,
        ...style,
      }}
    >
      {segs.map((s, i) => {
        const p = spring({ frame: frame - start - i * stagger, fps, config: { damping: 10, mass: 0.6, stiffness: 160 } });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              color: s.hl ? hl : color,
              opacity: interpolate(p, [0, 0.4], [0, 1], clamp),
              transform: `translateY(${(1 - p) * size * 0.6}px) scale(${0.6 + p * 0.4}) rotate(${(1 - p) * (i % 2 ? 6 : -6)}deg)`,
            }}
          >
            {s.word}
          </span>
        );
      })}
    </div>
  );
};

/** Pílula/etiqueta arredondada. */
export const Pill: React.FC<{ children: React.ReactNode; bg: string; color?: string; size?: number; style?: React.CSSProperties }> = ({
  children,
  bg,
  color = c.white,
  size = 44,
  style,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: size * 0.35,
      padding: `${size * 0.32}px ${size * 0.7}px`,
      borderRadius: 999,
      background: bg,
      color,
      fontFamily: titleFont,
      fontWeight: 800,
      fontSize: size,
      boxShadow: "0 14px 34px rgba(0,0,0,0.25)",
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Check: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="12" fill={c.white} />
    <path d="M6.5 12.5l3.6 3.6 7.4-8" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Snowflake: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
    {[0, 60, 120].map((a) => (
      <g key={a} transform={`rotate(${a} 12 12)`}>
        <line x1="12" y1="2" x2="12" y2="22" />
        <path d="M9 4.5l3 2.5 3-2.5M9 19.5l3-2.5 3 2.5" />
      </g>
    ))}
  </svg>
);

export const WhatsIcon: React.FC<{ size: number; color?: string }> = ({ size, color = c.white }) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <path
      fill={color}
      d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.9-1.7l-.4-.3-3.8 1.2 1.2-3.7-.3-.4c-1.2-1.8-1.9-3.9-1.9-6 0-5.9 4.9-10.6 11-10.6s11 4.8 11 10.6-4.9 10.9-10.9 10.9zm6-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.2 1.4 3.4c.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"
    />
  </svg>
);
