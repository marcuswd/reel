import type React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { c, clamp, ease } from "./theme";

/** Typing com cursor. `cps` = caracteres por segundo (a 30 fps). */
export const Typewriter: React.FC<{
  text: string;
  start: number;
  cps?: number;
  caret?: boolean;
  caretColor?: string;
  style?: React.CSSProperties;
}> = ({ text, start, cps = 22, caret = true, caretColor = c.brand, style }) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor(((frame - start) * cps) / 30)));
  const done = n >= text.length;
  // Cursor fixo enquanto escreve; pisca quando termina; some 1,5 s depois
  const doneAt = start + (text.length * 30) / cps;
  const blinkOn = !done || Math.floor((frame - doneAt) / 12) % 2 === 0;
  const visible = caret && frame >= start && frame < doneAt + 45 && blinkOn;

  // O texto inteiro ocupa o espaço desde o início (o resto fica invisível),
  // para as linhas nunca mudarem de sítio durante o typing.
  return (
    <span style={{ whiteSpace: "pre-wrap", ...style }}>
      {text.slice(0, n)}
      <span style={{ position: "relative" }}>
        <span
          style={{
            position: "absolute",
            left: "0.02em",
            top: "0.08em",
            width: "0.07em",
            height: "0.9em",
            backgroundColor: caretColor,
            opacity: visible ? 1 : 0,
          }}
        />
      </span>
      <span style={{ visibility: "hidden" }}>{text.slice(n)}</span>
    </span>
  );
};

/**
 * Texto que entra palavra a palavra. Trechos entre [colchetes] ganham
 * um marcador âmbar que se pinta da esquerda para a direita.
 */
export const Words: React.FC<{
  text: string;
  start: number;
  gap?: number;
  markerAt?: number;
  style?: React.CSSProperties;
}> = ({ text, start, gap = 3, markerAt, style }) => {
  const frame = useCurrentFrame();
  const parts: { word: string; marked: boolean }[] = [];
  let marked = false;
  for (const raw of text.split(" ")) {
    let w = raw;
    const open = w.startsWith("[");
    if (open) {
      marked = true;
      w = w.slice(1);
    }
    const close = w.endsWith("]") || w.includes("]");
    w = w.replace("]", "");
    parts.push({ word: w, marked });
    if (close) marked = false;
  }
  const lastWordAt = start + parts.length * gap;
  const mStart = markerAt ?? lastWordAt + 6;
  const markedIdx = parts.map((p, i) => (p.marked ? i : -1)).filter((i) => i >= 0);

  return (
    <span style={style}>
      {parts.map((p, i) => {
        const s = start + i * gap;
        const k = markedIdx.indexOf(i);
        const span = 16 / Math.max(1, markedIdx.length);
        const mp = p.marked
          ? interpolate(frame, [mStart + k * span, mStart + (k + 1) * span], [0, 100], clamp)
          : 0;
        return (
          <span key={i}>
            <span
              style={{
                display: "inline-block",
                opacity: interpolate(frame, [s, s + 8], [0, 1], clamp),
                translate: interpolate(frame, [s, s + 12], ["0px 0.4em", "0px 0em"], { ...clamp, easing: ease }),
                backgroundImage: p.marked ? `linear-gradient(${c.marker}, ${c.marker})` : undefined,
                backgroundRepeat: "no-repeat",
                backgroundSize: `${mp}% 42%`,
                backgroundPosition: "0 88%",
              }}
            >
              {p.word}
              {p.marked && parts[i + 1]?.marked ? " " : ""}
            </span>
            {i < parts.length - 1 && !(p.marked && parts[i + 1]?.marked) ? " " : ""}
          </span>
        );
      })}
    </span>
  );
};
