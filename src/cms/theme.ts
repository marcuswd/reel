import { loadFont } from "@remotion/fonts";
import { Easing, interpolate, staticFile } from "remotion";

// Geist variável: a mesma fonte do portal e do painel.
loadFont({ family: "Geist", url: staticFile("cms/geist.woff2"), weight: "100 900" });

export const font = "Geist, Inter, sans-serif";

// Cores do ds-tis (brand-50 … brand-950) + âmbar de acento
export const c = {
  ink: "#0a1633",
  navy: "#132655",
  deep: "#143b8b",
  brand: "#0065ed",
  sky: "#56a7fa",
  pale: "#daeafe",
  amber: "#f1aa34",
  white: "#ffffff",
  muted: "#9fb3d6",
  line: "rgba(159,179,214,0.18)",
} as const;

export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Entrada padrão: fade + subida, a partir do frame `start`. */
export const rise = (frame: number, start: number, distance = 40, dur = 18) => ({
  opacity: interpolate(frame, [start, start + dur * 0.7], [0, 1], clamp),
  translate: interpolate(frame, [start, start + dur], [`0px ${distance}px`, "0px 0px"], {
    ...clamp,
    easing: ease,
  }),
});
