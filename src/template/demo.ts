// Props de exemplo para a composição "Video" quando ainda não há job construído.
import brand from "../../brands/marcuswd.json";
import { brandSchema, jobSchema, type VideoProps } from "../core/schema";

export const DEMO: VideoProps = {
  brand: brandSchema.parse(brand),
  langCode: "pt-BR",
  format: "16:9",
  voice: {},
  clipCaptions: {},
  musicSrc: null,
  job: jobSchema.parse({
    slug: "demo",
    brand: "marcuswd",
    music: { mode: "none" },
    scenes: [
      { id: "capa", type: "cover", eyebrow: "Gerador de vídeo", title: "Vídeo como [código]", subtitle: "Roteiro em JSON, marca em JSON, render em um comando" },
      { id: "lista", type: "list", title: "O que vem [pronto]", items: ["Câmera virtual", "Transições da marca", "Trilha sincronizada", "Legendas e idiomas"] },
      { id: "numeros", type: "stats", items: [{ value: 11, label: "tipos de cena" }, { value: 15, label: "transições" }, { value: 4, label: "formatos" }] },
      { id: "fim", type: "cta", title: "Bora [renderizar]", button: "pnpm video render" },
    ],
  }),
};
