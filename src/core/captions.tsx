import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CAPTION_PLATE, inkOn } from "./color";
import { fontStack, hexA, useBrand, useLayout, useVideo } from "./context";
import type { CaptionItem } from "./schema";

/**
 * Legendas queimadas. As palavras vêm com tempo (locução TTS ou transcrição Whisper)
 * e são agrupadas em "páginas" curtas, com a palavra falada em destaque.
 * Estilos: pop (estilo Reels, grande e central-baixo), line (legenda clássica), box (karaokê numa caixa).
 * Contraste: todo estilo fica sobre uma placa preta (CAPTION_PLATE) que garante AA para o branco sobre
 * qualquer fundo; a palavra falada vira uma pílula na cor de destaque com texto preto ou branco (inkOn).
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
  const ink = inkOn(brand.colors.highlight);
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
          padding: `${(style === "pop" ? 10 : 12) * u}px ${(style === "pop" ? 22 : 26) * u}px`,
          borderRadius: (style === "line" ? 10 : 18) * u,
          background: hexA("#000000", CAPTION_PLATE),
          boxShadow: style === "pop" ? `0 0 ${36 * u}px ${12 * u}px ${hexA("#000000", CAPTION_PLATE * 0.6)}` : undefined,
          textShadow: style === "pop" ? `0 ${2 * u}px ${8 * u}px rgba(0,0,0,0.6)` : undefined,
          transform: `translateY(${(1 - enter) * 30 * u}px) scale(${interpolate(enter, [0, 1], [0.92, 1])})`,
          // sem fade de opacidade: a entrada é só escala e deslocamento, então nenhum quadro tem legenda apagada
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
                  color: active ? ink : style === "box" && !spoken ? hexA("#ffffff", 0.7) : "#fff",
                  background: active ? brand.colors.highlight : undefined,
                  textShadow: active ? "none" : undefined,
                  borderRadius: 8 * u,
                  padding: `0 ${0.12}em`,
                  margin: `0 ${-0.12}em`,
                  display: "inline-block",
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
  // a última palavra da frase não fica sozinha numa página: volta para a anterior se couber com folga
  for (let i = pages.length - 1; i > 0; i--) {
    const [a, b] = [pages[i - 1], pages[i]];
    const text = (p: Page) => p.words.map((w) => w.text.trim()).join(" ");
    const sameSentence = !/[.!?]$/.test(text(a)) && b.startMs - a.endMs <= 350;
    if (b.words.length === 1 && sameSentence && text(a).length + text(b).length + 1 <= maxChars + 8) {
      a.words.push({ ...b.words[0], text: ` ${b.words[0].text.trim()}` });
      a.endMs = b.endMs;
      pages.splice(i, 1);
    }
  }
  // cada página fica na tela até a próxima começar (no máximo +500 ms)
  pages.forEach((p, i) => (p.endMs = Math.min(pages[i + 1]?.startMs ?? Infinity, p.endMs + 500)));
  return pages;
};
