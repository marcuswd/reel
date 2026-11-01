// Tradução automática dos textos de um job (usada por `pnpm video translate <pasta> --to en --auto`).
// Ordem: DEEPL_API_KEY (DeepL) > ANTHROPIC_API_KEY (Claude) > OPENAI_API_KEY.
// Sem chave nenhuma, o arquivo i18n é criado com os campos vazios para o Claude (no chat) ou você preencher.
// Trechos entre [colchetes] são mantidos: o destaque continua nas palavras traduzidas equivalentes.
import { die, log } from "./lib/env.ts";

const asJsonPrompt = (src: Record<string, string>, from: string, to: string) =>
  `Translate the JSON values from ${from} to ${to} for a short marketing video. Keep it natural, concise and with the same tone. ` +
  `Keep square brackets around the translated equivalent of bracketed words. Keep numbers, brand names and URLs. ` +
  `Return ONLY the JSON object with the same keys.\n\n${JSON.stringify(src, null, 2)}`;

const parseJson = (t: string) => JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)) as Record<string, string>;

export const translate = async (src: Record<string, string>, from: string, to: string): Promise<Record<string, string>> => {
  const keys = Object.keys(src);
  if (!keys.length) return {};
  if (process.env.DEEPL_API_KEY) {
    const key = process.env.DEEPL_API_KEY;
    const host = key.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
    const body = new URLSearchParams({ source_lang: from.split("-")[0].toUpperCase(), target_lang: to.toUpperCase() === "EN" ? "EN-US" : to.toUpperCase(), tag_handling: "xml" });
    // colchetes viram tags para o DeepL preservar
    for (const k of keys) body.append("text", src[k].replace(/\[/g, "<hl>").replace(/\]/g, "</hl>"));
    const r = await fetch(`https://${host}/v2/translate`, { method: "POST", headers: { Authorization: `DeepL-Auth-Key ${key}` }, body });
    if (!r.ok) die(`DeepL ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = (await r.json()) as { translations: { text: string }[] };
    log(`DeepL: ${keys.length} textos`);
    return Object.fromEntries(keys.map((k, i) => [k, j.translations[i].text.replace(/<hl>/g, "[").replace(/<\/hl>/g, "]")]));
  }
  if (process.env.ANTHROPIC_API_KEY) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5", max_tokens: 4000, messages: [{ role: "user", content: asJsonPrompt(src, from, to) }] }),
    });
    if (!r.ok) die(`Anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = (await r.json()) as { content: { text: string }[] };
    log(`Claude: ${keys.length} textos`);
    return parseJson(j.content.map((c) => c.text).join(""));
  }
  if (process.env.OPENAI_API_KEY) {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL ?? "gpt-4o-mini", response_format: { type: "json_object" }, messages: [{ role: "user", content: asJsonPrompt(src, from, to) }] }),
    });
    if (!r.ok) die(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = (await r.json()) as { choices: { message: { content: string } }[] };
    return parseJson(j.choices[0].message.content);
  }
  log("sem DEEPL_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY: campos ficam vazios para preencher à mão (ou pelo Claude no chat)");
  return {};
};
