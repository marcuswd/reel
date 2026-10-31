import type { CaptionItem } from "./schema";

/** Legendas -> SRT e WebVTT (usado pelo script de render). */
export const toSrt = (captions: CaptionItem[], maxChars = 42) => {
  const fmt = (ms: number) => {
    const t = Math.max(0, Math.round(ms));
    const hh = String(Math.floor(t / 3600000)).padStart(2, "0");
    const mm = String(Math.floor((t % 3600000) / 60000)).padStart(2, "0");
    const ss = String(Math.floor((t % 60000) / 1000)).padStart(2, "0");
    return `${hh}:${mm}:${ss},${String(t % 1000).padStart(3, "0")}`;
  };
  const blocks: { start: number; end: number; text: string }[] = [];
  let cur = null as { start: number; end: number; text: string } | null;
  for (const c of captions) {
    const w = c.text.trim();
    if (!w) continue;
    if (cur && (cur.text.length + w.length + 1 > maxChars || c.startMs - cur.end > 700 || /[.!?]$/.test(cur.text))) {
      blocks.push(cur);
      cur = null;
    }
    cur = cur === null ? { start: c.startMs, end: c.endMs, text: w } : { start: cur.start, end: c.endMs, text: `${cur.text} ${w}` };
  }
  if (cur) blocks.push(cur);
  return blocks.map((b, i) => `${i + 1}\n${fmt(b.start)} --> ${fmt(b.end)}\n${b.text}\n`).join("\n");
};

export const toVtt = (captions: CaptionItem[], maxChars = 42) =>
  "WEBVTT\n\n" +
  toSrt(captions, maxChars)
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
    .replace(/^\d+\n/gm, "");
