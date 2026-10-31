import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const fontFamily = "Inter";

// Fontes locais em public/fonts: o render não depende de rede.
// Para trocar de fonte, coloque os .woff2 em public/fonts e ajuste aqui.
Promise.all(
  (["400", "600", "800"] as const).map((weight) =>
    loadFont({
      family: fontFamily,
      url: staticFile(`fonts/Inter-${weight}.woff2`),
      weight,
    }),
  ),
);

export const theme = {
  bg: "#0b0d12",
  surface: "#151924",
  text: "#f4f5f7",
  muted: "#8b93a7",
  accent: "#ff5a36",
} as const;
