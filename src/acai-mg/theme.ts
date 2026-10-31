import { loadFont } from "@remotion/fonts";
import { Easing, interpolate, staticFile } from "remotion";

// Fontes do site (Montserrat nos títulos, Quicksand no apoio), locais em public/distribuidora-acai-mg/fonts
for (const w of ["500", "700", "800", "900"] as const) {
  loadFont({ family: "Montserrat", url: staticFile(`distribuidora-acai-mg/fonts/montserrat-latin-${w}-normal.woff2`), weight: w });
}
for (const w of ["500", "700"] as const) {
  loadFont({ family: "Quicksand", url: staticFile(`distribuidora-acai-mg/fonts/quicksand-latin-${w}-normal.woff2`), weight: w });
}
export const title = "Montserrat, sans-serif";
export const body = "Quicksand, sans-serif";

// Paleta do site + tons de açaí
export const c = {
  acai: "#3d365c", // roxo do site
  acaiDeep: "#22162f",
  acaiVivid: "#5b2a6e",
  berry: "#4a1f5c",
  magenta: "#cc3366",
  pink: "#c95792",
  orange: "#f8b55f",
  green: "#319746",
  cream: "#fff6ec",
  white: "#ffffff",
  whatsapp: "#25d366",
} as const;

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);

/** Saída da cena: 0 → 1 nos últimos `dur` frames. */
export const exitProgress = (frame: number, total: number, dur = 10) =>
  interpolate(frame, [total - dur, total], [0, 1], { ...clamp, easing: inOut });
