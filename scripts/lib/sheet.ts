// Folha de contato: grade de imagens em um único jpg (ffmpeg). Puro: só monta os argumentos.

export type SheetOpts = {
  /** largura e altura de cada célula, em px */
  w: number;
  h: number;
  /** colunas máximas (a grade usa min(cols, n)) */
  cols: number;
  /** filtro extra aplicado em cada célula depois do redimensionamento (recebe o índice) */
  cell?: (i: number) => string;
  /** cobre a célula cortando o excesso (padrão: encaixa e completa com preto) */
  cover?: boolean;
};

/** Argumentos do ffmpeg para montar a folha de `files` em `out`. */
export const sheetArgs = (files: string[], out: string, o: SheetOpts): string[] => {
  if (!files.length) throw new Error("folha de contato sem imagens");
  const cols = Math.max(1, Math.min(o.cols, files.length));
  const fit = o.cover
    ? `scale=${o.w}:${o.h}:force_original_aspect_ratio=increase,crop=${o.w}:${o.h}`
    : `scale=${o.w}:${o.h}:force_original_aspect_ratio=decrease,pad=${o.w}:${o.h}:(ow-iw)/2:(oh-ih)/2:color=black`;
  const tile = (i: number) => `[${i}:v]${fit},setsar=1${o.cell ? `,${o.cell(i)}` : ""}[v${i}]`;
  const inputs = files.flatMap((f) => ["-i", f]);
  // xstack exige 2 entradas ou mais: com uma imagem, a folha é a própria célula
  const graph = files.length === 1
    ? tile(0).replace(/\[v0\]$/, "")
    : `${files.map((_, i) => tile(i)).join(";")};${files.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${files.length}:layout=${files
        .map((_, i) => `${(i % cols) * o.w}_${Math.floor(i / cols) * o.h}`)
        .join("|")}:fill=black`;
  return ["-y", "-loglevel", "error", ...inputs, "-filter_complex", graph, "-frames:v", "1", "-q:v", "3", out];
};
