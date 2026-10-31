// Cor e contraste (WCAG 2.x), puro: usado pelas legendas e pelos testes.

export type RGB = [number, number, number];

export const rgb = (hex: string): RGB => {
  let h = hex.replace("#", "");
  if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
};

/** Luminância relativa (0 preto, 1 branco). */
export const luminance = (c: string | RGB) => {
  const [r, g, b] = (typeof c === "string" ? rgb(c) : c).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Razão de contraste entre duas cores (1 a 21). AA para texto: 4,5. */
export const contrast = (a: string | RGB, b: string | RGB) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

/** Cor resultante de `fg` com opacidade `alpha` sobre `bg`. */
export const over = (fg: string, alpha: number, bg: string): RGB => {
  const [f, b] = [rgb(fg), rgb(bg)];
  return f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha))) as RGB;
};

/** Preto ou branco, o que contrastar mais com `bg`. */
export const inkOn = (bg: string) => (contrast("#000000", bg) >= contrast("#ffffff", bg) ? "#000000" : "#ffffff");

export const AA = 4.5;
/** Opacidade da placa preta atrás das legendas: com ela, texto branco passa no AA até sobre fundo branco. */
export const CAPTION_PLATE = 0.62;
