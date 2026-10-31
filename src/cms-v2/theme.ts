import { Easing, interpolate } from "remotion";
import "../cms/theme"; // carrega a fonte Geist

export const font = "Geist, Inter, sans-serif";

// Tema claro com as cores do ds-tis
export const c = {
  bg: "#f5f9ff",
  bg2: "#eaf2ff",
  ink: "#132655", // brand-950: texto
  text: "#3a4a6b",
  soft: "#6b7a99",
  brand: "#0065ed", // brand-600
  brand2: "#2884f7",
  pale: "#daeafe", // brand-100
  pale2: "#bcdcfe",
  amber: "#f1aa34",
  marker: "rgba(241,170,52,0.38)",
  white: "#ffffff",
  line: "rgba(19,38,85,0.10)",
} as const;

export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const rise = (frame: number, start: number, distance = 30, dur = 18) => ({
  opacity: interpolate(frame, [start, start + dur * 0.7], [0, 1], clamp),
  translate: interpolate(frame, [start, start + dur], [`0px ${distance}px`, "0px 0px"], { ...clamp, easing: ease }),
});
