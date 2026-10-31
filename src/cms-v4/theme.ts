import { loadFont } from "@remotion/fonts";
import { Easing, interpolate, staticFile } from "remotion";

// Archivo: a tipografia do site da TIS (tis.ao)
for (const w of ["300", "400", "500", "700"] as const) {
  loadFont({ family: "Archivo", url: staticFile(`cms/fonts/archivo-${w}.woff2`), weight: w });
}
export const font = "Archivo, sans-serif";

// Paleta do site da TIS
export const c = {
  navy: "#04165D",
  navyDeep: "#020C3A",
  blue: "#036EF2",
  cyan: "#00AAFF",
  purple: "#3126B4",
  light: "#F1F6FB",
  white: "#FFFFFF",
  ink: "#04165D", // texto sobre claro
  text: "#4A5578", // texto secundário sobre claro
  mist: "#B9C8EC", // texto secundário sobre escuro
  line: "rgba(4,22,93,0.10)",
} as const;

export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const rise = (frame: number, start: number, distance = 30, dur = 20) => ({
  opacity: interpolate(frame, [start, start + dur * 0.7], [0, 1], clamp),
  translate: interpolate(frame, [start, start + dur], [`0px ${distance}px`, "0px 0px"], { ...clamp, easing: ease }),
});

// ── Tempo de leitura ──
// Leitura confortável de texto em vídeo: ~3 palavras por segundo (180 ppm),
// abaixo das 200 a 250 ppm de leitura corrida, porque o olho também segue a imagem.
export const WORDS_PER_SECOND = 3;
export const countWords = (...texts: string[]) =>
  texts.join(" ").replace(/[[\]]/g, "").split(/\s+/).filter(Boolean).length;
/** Duração da cena: entrada + tempo de leitura + respiro, nunca abaixo de `min`. */
export const readingSeconds = (words: number, min: number, entry = 2.2, rest = 1.3) =>
  Math.max(min, entry + words / WORDS_PER_SECOND + rest);
