import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, fontStack, hexA, useBrand, useLayout, useVideo } from "./context";
import type { CaptionItem } from "./schema";

/**
 * Legendas queimadas. As palavras vêm com tempo (locução TTS ou transcrição Whisper)
 * e são agrupadas em "páginas" curtas, com a palavra falada em destaque.
 * Estilos: pop (estilo Reels, grande e central-baixo), line (legenda clássica), box (karaokê numa caixa).
 */
export const Captions: React.FC<{ captions: CaptionItem[]; style: "pop" | "line" | "box" }> = ({ captions, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const brand = useBrand();
  const { u, vertical, captionBand } = useLayout();
  const { job } = useVideo();
  const nowMs = (frame / fps) * 1000;
  const pages = useMemo(() => paginate(captions, style === "line" ? 2600 : vertical ? 1100 : 1500, style === "line" ? 42 : vertical ? 22 : 34), [captions, style, vertical]);
  const page = pages.find((p) => nowMs >= p.startMs && nowMs < p.endMs);
  if (!page) return null;
  const local = ((nowMs - page.startMs) / 1000) * fps;
  const enter = spring({ frame: local, fps, config: { damping: 14, mass: 0.6 } });
  const size = (style === "pop" ? (vertical ? 76 : 64) : vertical ? 52 : 46) * u;
  // centralizada na faixa reservada (useLayout.captionBand)
  const bottom = job.safe.bottom + (vertical ? 150 : 90) * u * 0.6 + captionBand / 2 - size * 0.7;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", pointerEvents: "none" }}>
      <div
        style={{
          marginBottom: bottom,
          maxWidth: vertical ? "86%" : "70%",
          textAlign: "center",
          fontFamily: fontStack(style === "pop" ? brand.fonts.heading.family : brand.fonts.body.family),
          fontWeight: style === "pop" ? 900 : 700,
          fontSize: size,
          lineHeight: 1.15,
          color: "#fff",
          padding: style === "pop" ? 0 : `${12 * u}px ${26 * u}px`,
          borderRadius: style === "box" ? 18 * u : 10 * u,
          background: style === "pop" ? undefined : hexA("#000000", style === "box" ? 0.62 : 0.5),
          textShadow: style === "pop" ? `0 ${4 * u}px ${18 * u}px rgba(0,0,0,0.7), 0 0 ${3 * u}px rgba(0,0,0,0.9)` : undefined,
          WebkitTextStroke: style === "pop" ? `${2 * u}px rgba(0,0,0,0.85)` : undefined,
          paintOrder: "stroke fill",
          transform: `translateY(${(1 - enter) * 30 * u}px) scale(${interpolate(enter, [0, 1], [0.92, 1])})`,
          opacity: interpolate(enter, [0, 0.5], [0, 1], clamp),
          textTransform: style === "pop" ? "uppercase" : undefined,
        }}
      >
        {page.words.map((t, i) => {
          const active = nowMs >= t.fromMs && nowMs < t.toMs;
          const spoken = nowMs >= t.fromMs;
          return (
            <React.Fragment key={i}>
              {i > 0 ? " " : null}
              <span
                style={{
                  color: active ? brand.colors.highlight : style === "box" && !spoken ? hexA("#ffffff", 0.55) : "#fff",
                  display: "inline-block",
                  transform: style === "pop" && active ? "translateY(-0.04em)" : undefined,
                }}
              >
                {t.text.trim()}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

type Page = { startMs: number; endMs: number; words: { text: string; fromMs: number; toMs: number }[] };
/** Agrupa palavras em "páginas": quebra em pausas, fim de frase, limite de tempo e de caracteres. */
export const paginate = (caps: CaptionItem[], maxMs: number, maxChars: number): Page[] => {
  const pages: Page[] = [];
  let cur: Page | null = null;
  let chars = 0;
  for (const c of caps) {
    const w = c.text.trim();
    if (!w) continue;
    const prev = cur?.words[cur.words.length - 1];
    const brk = !cur || c.startMs - cur.endMs > 350 || c.endMs - cur.startMs > maxMs || chars + w.length + 1 > maxChars || (prev && /[.!?]$/.test(prev.text.trim()));
    if (brk) {
      cur = { startMs: c.startMs, endMs: c.endMs, words: [] };
      pages.push(cur);
      chars = 0;
    }
    cur!.words.push({ text: `${cur!.words.length ? " " : ""}${w}`, fromMs: c.startMs, toMs: c.endMs });
    cur!.endMs = c.endMs;
    chars += w.length + 1;
  }
  // cada página fica na tela até a próxima começar (no máximo +500 ms)
  pages.forEach((p, i) => (p.endMs = Math.min(pages[i + 1]?.startMs ?? Infinity, p.endMs + 500)));
  return pages;
};
