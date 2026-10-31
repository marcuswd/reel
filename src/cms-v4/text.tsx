import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { c, clamp, ease } from "./theme";

/**
 * Typing. O texto inteiro reserva o espaço desde o início (nada muda de linha)
 * e o cursor só existe enquanto há caracteres a ser escritos: nunca fica sozinho.
 */
export const Typewriter: React.FC<{ text: string; start: number; cps?: number; caretColor?: string; style?: React.CSSProperties }> = ({
  text,
  start,
  cps = 14,
  caretColor = c.cyan,
  style,
}) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor(((frame - start) * cps) / 30)));
  const typing = n > 0 && n < text.length;
  return (
    <span style={{ whiteSpace: "pre-wrap", ...style }}>
      {text.slice(0, n)}
      <span style={{ position: "relative" }}>
        {typing ? (
          <span style={{ position: "absolute", left: "0.03em", top: "0.1em", width: "0.06em", height: "0.85em", backgroundColor: caretColor }} />
        ) : null}
      </span>
      <span style={{ visibility: "hidden" }}>{text.slice(n)}</span>
    </span>
  );
};

/** Duração (em frames) do typing, para encadear animações a seguir. */
export const typingFrames = (text: string, cps = 14) => Math.ceil((text.length * 30) / cps);

/**
 * Texto que entra palavra a palavra. Trechos entre [colchetes] ficam em
 * destaque (cor de acento e peso maior), como nos títulos do site da TIS.
 */
export const Rich: React.FC<{ text: string; start: number; gap?: number; accent?: string; style?: React.CSSProperties }> = ({
  text,
  start,
  gap = 4,
  accent = c.cyan,
  style,
}) => {
  const frame = useCurrentFrame();
  const words: { w: string; hi: boolean }[] = [];
  let hi = false;
  for (const raw of text.split(" ")) {
    let w = raw;
    if (w.startsWith("[")) {
      hi = true;
      w = w.slice(1);
    }
    const close = w.includes("]");
    words.push({ w: w.replace("]", ""), hi });
    if (close) hi = false;
  }
  return (
    <span style={style}>
      {words.map((p, i) => {
        const s = start + i * gap;
        return (
          <span key={i}>
            <span
              style={{
                display: "inline-block",
                opacity: interpolate(frame, [s, s + 8], [0, 1], clamp),
                translate: interpolate(frame, [s, s + 14], ["0px 0.45em", "0px 0em"], { ...clamp, easing: ease }),
                filter: `blur(${interpolate(frame, [s, s + 10], [6, 0], clamp)}px)`,
                color: p.hi ? accent : undefined,
                fontWeight: p.hi ? 600 : undefined,
              }}
            >
              {p.w}
            </span>
            {i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </span>
  );
};

/** Frames até a última palavra de um `Rich` aparecer. */
export const richFrames = (text: string, gap = 4) => text.split(" ").length * gap + 14;

/** Rótulo do site da TIS: TEXTO EM CAIXA ALTA ●────● */
export const Eyebrow: React.FC<{ label: string; start: number; color?: string; lineColor?: string; width?: number; style?: React.CSSProperties }> = ({
  label,
  start,
  color = c.cyan,
  lineColor,
  width = 90,
  style,
}) => {
  const frame = useCurrentFrame();
  const lc = lineColor ?? color;
  const grow = interpolate(frame, [start + 6, start + 26], [0, width], { ...clamp, easing: ease });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, ...style }}>
      <span
        style={{
          fontSize: 20,
          fontWeight: 500,
          letterSpacing: 5,
          textTransform: "uppercase",
          color,
          opacity: interpolate(frame, [start, start + 10], [0, 1], clamp),
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", opacity: interpolate(frame, [start + 4, start + 10], [0, 1], clamp) }}>
        <div style={{ width: 7, height: 7, borderRadius: 9, backgroundColor: lc }} />
        <div style={{ width: grow, height: 2, backgroundColor: lc }} />
        <div style={{ width: 7, height: 7, borderRadius: 9, backgroundColor: lc, opacity: grow > width * 0.9 ? 1 : 0 }} />
      </div>
    </div>
  );
};
