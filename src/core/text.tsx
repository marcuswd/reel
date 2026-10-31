import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, ease, fontStack, springFor, useBrand, useLayout } from "./context";
import { stripMarks } from "./timeline";

type Seg = { word: string; hl: boolean };
/** "texto com [destaque]" -> palavras marcadas */
export const parseMarks = (text: string): Seg[] => {
  const out: Seg[] = [];
  // pontuação logo após o destaque gruda na última palavra ("[vendem]," -> "vendem,")
  const re = /\[([^\]]+)\]([.,!?;:…)]*)|([^\s[\]]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[1]) {
      const ws = m[1].split(/\s+/);
      ws.forEach((w, i) => out.push({ word: i === ws.length - 1 ? w + (m![2] ?? "") : w, hl: true }));
    } else out.push({ word: m[3], hl: false });
  }
  return out;
};

/** Tamanho de título que encolhe com textos longos (em px de design, multiplique por u). */
export const autoSize = (text: string, base: number, ideal = 22, min = 0.55) => {
  const n = stripMarks(text).length;
  return base * Math.max(min, Math.min(1, Math.sqrt(ideal / Math.max(1, n))));
};

/**
 * Texto que entra palavra a palavra. [Colchetes] ganham a cor de destaque.
 * A animação segue a energia da marca: calm (fade + subida), normal (subida + blur), playful (mola com giro).
 */
export const Words: React.FC<{
  text: string;
  start: number;
  size: number; // px finais
  color?: string;
  hl?: string;
  stagger?: number;
  weight?: number;
  font?: "heading" | "body";
  align?: "center" | "left" | "right";
  lineHeight?: number;
  style?: React.CSSProperties;
}> = ({ text, start, size: baseSize, color, hl, stagger, weight, font = "heading", align = "left", lineHeight = 1.08, style }) => {
  let size = baseSize;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrand();
  const energy = brand.motion.energy;
  const segs = parseMarks(text);
  const gap = stagger ?? (energy === "playful" ? 3 : energy === "calm" ? 4 : 3);
  const f = font === "heading" ? brand.fonts.heading : brand.fonts.body;
  const fam = f.family;
  size = baseSize * (f.scale ?? 1);
  const w = weight ?? (font === "heading" ? Number(Object.keys(brand.fonts.heading.files).sort().at(-1) ?? 800) : 500);
  return (
    <div
      style={{
        fontFamily: fontStack(fam),
        fontWeight: w,
        fontSize: size,
        lineHeight,
        color: color ?? brand.colors.text,
        textAlign: align,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
        columnGap: size * 0.25,
        letterSpacing: font === "heading" ? -size * 0.015 : 0,
        textTransform: f.uppercase ? "uppercase" : undefined,
        ...style,
      }}
    >
      {segs.map((s, i) => {
        const t = frame - start - i * gap;
        let st: React.CSSProperties;
        if (energy === "playful") {
          const p = spring({ frame: t, fps, config: springFor("playful") });
          st = {
            opacity: interpolate(p, [0, 0.4], [0, 1], clamp),
            transform: `translateY(${(1 - p) * size * 0.6}px) scale(${0.6 + p * 0.4}) rotate(${(1 - p) * (i % 2 ? 6 : -6)}deg)`,
          };
        } else if (energy === "calm") {
          st = {
            opacity: interpolate(t, [0, 14], [0, 1], clamp),
            transform: `translateY(${interpolate(t, [0, 20], [size * 0.25, 0], { ...clamp, easing: ease })}px)`,
          };
        } else {
          st = {
            opacity: interpolate(t, [0, 8], [0, 1], clamp),
            transform: `translateY(${interpolate(t, [0, 14], [size * 0.45, 0], { ...clamp, easing: ease })}px)`,
            filter: `blur(${interpolate(t, [0, 10], [6, 0], clamp)}px)`,
          };
        }
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              color: s.hl && brand.shape.highlight !== "marker" ? (hl ?? brand.colors.highlight) : undefined,
              backgroundImage: s.hl && brand.shape.highlight === "marker" ? `linear-gradient(transparent 55%, ${hl ?? brand.colors.highlight} 55%, ${hl ?? brand.colors.highlight} 92%, transparent 92%)` : undefined,
              paddingInline: s.hl && brand.shape.highlight === "marker" ? "0.06em" : undefined,
              // marca-texto contínuo entre palavras destacadas vizinhas
              ...(s.hl && brand.shape.highlight === "marker" && segs[i + 1]?.hl ? { paddingRight: `calc(0.06em + ${size * 0.25}px)`, marginRight: -size * 0.25 } : {}),
              ...st,
            }}
          >
            {s.word}
          </span>
        );
      })}
    </div>
  );
};

/** Frames até a última palavra de um Words aparecer. */
export const wordsFrames = (text: string, stagger = 3) => parseMarks(text).length * stagger + 14;

/** Digitação com cursor; o espaço final é reservado desde o início (nada pula de linha). */
export const Typewriter: React.FC<{ text: string; start: number; cps?: number; caret?: string; style?: React.CSSProperties }> = ({ text, start, cps = 16, caret, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrand();
  const n = Math.max(0, Math.min(text.length, Math.floor(((frame - start) * cps) / fps)));
  const typing = n > 0 && n < text.length;
  return (
    <span style={{ whiteSpace: "pre-wrap", ...style }}>
      {text.slice(0, n)}
      <span style={{ position: "relative" }}>
        {typing ? <span style={{ position: "absolute", left: "0.03em", top: "0.1em", width: "0.06em", height: "0.85em", backgroundColor: caret ?? brand.colors.highlight }} /> : null}
      </span>
      <span style={{ visibility: "hidden" }}>{text.slice(n)}</span>
    </span>
  );
};

/** Rótulo em caixa alta com linha que cresce: TEXTO ●────● */
export const Eyebrow: React.FC<{ label: string; start: number; color?: string; align?: "left" | "center"; style?: React.CSSProperties }> = ({ label, start, color, align = "left", style }) => {
  const frame = useCurrentFrame();
  const brand = useBrand();
  const { u } = useLayout();
  const col = color ?? brand.colors.accent;
  const width = 90 * u;
  const grow = interpolate(frame, [start + 6, start + 26], [0, width], { ...clamp, easing: ease });
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: align === "center" ? "center" : "flex-start", gap: 20 * u, ...style }}>
      <span
        style={{
          fontFamily: fontStack(brand.fonts.body.family),
          fontSize: 24 * u,
          fontWeight: 700,
          letterSpacing: 5 * u,
          textTransform: "uppercase",
          color: col,
          opacity: interpolate(frame, [start, start + 10], [0, 1], clamp),
        }}
      >
        {stripMarks(label)}
      </span>
      <div style={{ display: "flex", alignItems: "center", opacity: interpolate(frame, [start + 4, start + 10], [0, 1], clamp) }}>
        <div style={{ width: 8 * u, height: 8 * u, borderRadius: 9, backgroundColor: col }} />
        <div style={{ width: grow, height: 2 * u, backgroundColor: col }} />
        <div style={{ width: 8 * u, height: 8 * u, borderRadius: 9, backgroundColor: col, opacity: grow > width * 0.9 ? 1 : 0 }} />
      </div>
    </div>
  );
};

/** Número que conta até o valor. */
export const Counter: React.FC<{ value: number; start: number; dur?: number; decimals?: number; prefix?: string; suffix?: string; locale?: string }> = ({
  value,
  start,
  dur = 40,
  decimals = 0,
  prefix = "",
  suffix = "",
  locale = "pt-BR",
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing: ease });
  const v = (value * p).toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {v}
      {suffix}
    </span>
  );
};
