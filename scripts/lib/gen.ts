// Imagens por IA (pnpm media gen): FLUX.1 schnell no Cloudflare Workers AI, grátis (~170 imagens/dia na
// cota gratuita), licença Apache 2.0 (uso comercial livre). Só fundos, objetos, texturas e ilustrações:
// regra da casa, nunca pessoas. Puro: monta prompt e requisição; quem chama faz o fetch.
export const MODEL = "@cf/black-forest-labs/flux-1-schnell";

export type GenBrand = { name?: string; colors?: { primary?: string; accent?: string; highlight?: string; bg?: string; palette?: string[] } };

/** Prompt final: pedido + estilo + paleta da marca + restrições fixas. */
export const buildPrompt = (prompt: string, opts: { brand?: GenBrand; style?: string } = {}) => {
  const c = opts.brand?.colors;
  const palette = c ? [...new Set([c.primary, c.accent, c.highlight, ...(c.palette ?? []), c.bg].filter(Boolean))].slice(0, 5) : [];
  return [
    prompt.trim().replace(/[.\s]+$/, ""),
    opts.style?.trim(),
    palette.length ? `color palette ${palette.join(", ")}` : undefined,
    "high quality, clean composition, professional lighting",
    "no people, no humans, no faces, no hands, no text, no letters, no logos, no watermark",
  ].filter(Boolean).join(". ") + ".";
};

/** Requisição para a API REST do Workers AI. */
export const genRequest = (account: string, token: string, prompt: string, opts: { steps?: number; seed?: number } = {}) => ({
  url: `${process.env.CF_API_BASE ?? "https://api.cloudflare.com/client/v4"}/accounts/${account}/ai/run/${MODEL}`,
  init: {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, steps: Math.min(8, Math.max(1, opts.steps ?? 4)), ...(opts.seed !== undefined ? { seed: opts.seed } : {}) }),
  },
});

/** Resposta da API → bytes da imagem (JPEG), ou erro com a mensagem da Cloudflare. */
export const genImage = (json: unknown): Buffer => {
  const j = json as { success?: boolean; result?: { image?: string }; errors?: { message: string }[] };
  if (!j?.result?.image) throw new Error(`Cloudflare: ${j?.errors?.map((e) => e.message).join("; ") || "resposta sem imagem"}`);
  return Buffer.from(j.result.image, "base64");
};

/** Nomes das variações: foto.jpg → foto-1.jpg, foto-2.jpg… */
export const variantNames = (out: string, n: number) => (n <= 1 ? [out] : Array.from({ length: n }, (_, i) => out.replace(/(\.[a-z0-9]+)?$/i, (ext) => `-${i + 1}${ext || ".jpg"}`)));
