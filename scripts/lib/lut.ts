// Looks de cor (LUT 3D .cube) gerados por código, aplicados pelo ffmpeg (lut3d) no render e nos stills.
// brand.grade: "warm" | "cool" | "teal-orange" | "film" | "mono" | { lut: "luts/x.cube" } (arquivo próprio).
export const LOOKS = ["warm", "cool", "teal-orange", "film", "mono"] as const;
export type Look = (typeof LOOKS)[number];

type RGB = [number, number, number];
const c01 = (x: number) => Math.min(1, Math.max(0, x));
const luma = ([r, g, b]: RGB) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
/** curva em S suave (k = intensidade do contraste) */
const curve = (x: number, k: number) => x + k * (x - 0.5) * (1 - Math.abs(2 * x - 1));
const sat = (c: RGB, s: number): RGB => { const l = luma(c); return c.map((v) => l + (v - l) * s) as RGB; };

/** Cor de saída de um look para a cor de entrada (0..1). */
export const grade = (look: Look, c: RGB): RGB => {
  let [r, g, b] = c;
  switch (look) {
    case "warm": [r, g, b] = [r * 1.05 + 0.012, g * 1.01, b * 0.9]; break;
    case "cool": [r, g, b] = [r * 0.93, g * 1.0, b * 1.07 + 0.01]; break;
    case "teal-orange": {
      // sombras puxam para o azul-petróleo, luzes (pele, sol) para o laranja
      const l = luma(c);
      const t = l - 0.5;
      [r, g, b] = [r + t * 0.14, g + t * 0.03 - Math.abs(t) * 0.02, b - t * 0.16];
      [r, g, b] = sat([r, g, b], 1.08);
      break;
    }
    case "film": {
      // pretos levantados, brancos contidos, cor um pouco mais lavada e quente
      [r, g, b] = sat([r, g, b], 0.88);
      [r, g, b] = [0.045 + r * 0.92 + 0.01, 0.04 + g * 0.92, 0.05 + b * 0.89];
      break;
    }
    case "mono": { const l = luma(c); [r, g, b] = [l, l, l]; break; }
  }
  return [c01(curve(c01(r), 0.12)), c01(curve(c01(g), 0.12)), c01(curve(c01(b), 0.12))];
};

/** Texto .cube (LUT_3D_SIZE n; vermelho varia mais rápido, como o padrão pede). */
export const cube = (look: Look, n = 17) => {
  const lines = [`TITLE "reel ${look}"`, `LUT_3D_SIZE ${n}`];
  for (let bi = 0; bi < n; bi++)
    for (let gi = 0; gi < n; gi++)
      for (let ri = 0; ri < n; ri++) {
        const out = grade(look, [ri / (n - 1), gi / (n - 1), bi / (n - 1)]);
        lines.push(out.map((v) => v.toFixed(5)).join(" "));
      }
  return lines.join("\n") + "\n";
};

/** Caminho para o filtro lut3d do ffmpeg (no Windows "C:\x" vira "C\:/x"). */
export const lutFilter = (file: string) => `lut3d=file='${file.replace(/\\/g, "/").replace(/:/g, "\\:")}':interp=tetrahedral`;
