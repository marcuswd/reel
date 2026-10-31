// Roteiro da v5: as novidades do CMS TIS, uma cena por capítulo.
// [colchetes] = palavras em destaque. Durações em compassos (timeline.ts).
import type { Shot } from "../cms-v4/Screen";

const img = (name: string, iw = 1280, ih = 800) => ({ src: `cms/${name}.png`, iw, ih });
const foto = (name: string) => `cms/pessoas/${name}.jpg`;

export type Beat =
  | { kind: "shot"; shot: Shot; title: string; text: string }
  | { kind: "split"; title: string; items: string[]; photo?: string; card?: Shot }
  | { kind: "builder"; title: string; items: string[] }
  | { kind: "cards"; title: string; cards: { name: string; text: string; icon: "key" | "badge" | "folder" | "layers" }[] };

export type Chapter = { number: string; title: string; tagline: string; photo: string; beat: Beat };

export const cover = {
  eyebrow: "TIS apresenta",
  title: "CMS TIS",
  support: "O que há de novo [na sua intranet.]",
  photo: foto("pessoa-retrato"),
};

/** Sequência de novidades: o título no tempo 0 e um nome por tempo a seguir. */
export const rush = {
  eyebrow: "Novidades",
  title: "Novo no [CMS TIS]",
  names: ["Avisos", "Perguntar à intranet", "Ajudas da IA", "Reacções e comentários", "Reserva de salas", "Páginas montadas", "Integrações", "Verificação em dois passos"],
};

export const chapters: Chapter[] = [
  {
    number: "01",
    title: "Avisar",
    tagline: "Regras que todos [confirmam.]",
    photo: foto("pessoa-reuniao"),
    beat: {
      kind: "shot",
      shot: { ...img("p31-portal-aviso-modal"), focus: { x: 0.22, y: 0.27, w: 0.56, h: 0.38 } },
      title: "Avisos",
      text: "No ecrã até cada pessoa carregar em [Tomei conhecimento.]",
    },
  },
  {
    number: "02",
    title: "Perguntar",
    tagline: "Respostas [com as fontes.]",
    photo: foto("pessoa-equipa"),
    beat: {
      kind: "shot",
      shot: { ...img("p34-portal-perguntar", 1280, 1100), focus: { x: 0, y: 0.1, w: 0.62, h: 0.26 } },
      title: "Perguntar à intranet",
      text: "A IA responde só com o que [a pessoa pode ler.]",
    },
  },
  {
    number: "03",
    title: "Participar",
    tagline: "A conversa [acontece aqui.]",
    photo: foto("pessoa-trio"),
    beat: {
      kind: "split",
      photo: foto("pessoa-conversa"),
      card: img("p06-portal-evento"),
      title: "Reagir e [ir]",
      items: ["Reacções, comentários e menções", "Botão Vou, com vagas", "Lista de espera e lembrete"],
    },
  },
  {
    number: "04",
    title: "Reservar",
    tagline: "A sala certa, [sem emails.]",
    photo: foto("pessoa-conversa"),
    beat: {
      kind: "shot",
      shot: { ...img("p35-portal-reserva", 1280, 1274), focus: { x: 0.2, y: 0.07, w: 0.6, h: 0.42 } },
      title: "Reserva de salas",
      text: "Dia, horas e material. [Conflitos recusados.]",
    },
  },
  {
    number: "05",
    title: "Montar",
    tagline: "Cada zona, [a sua página.]",
    photo: foto("pessoa-retrato"),
    beat: {
      kind: "builder",
      title: "Páginas [montadas]",
      items: ["Blocos de notícias, eventos e vídeo", "Grelha livre de 12 colunas", "Audiência por bloco"],
    },
  },
  {
    number: "06",
    title: "Ligar",
    tagline: "Fala com [outros sistemas.]",
    photo: foto("pessoa-equipa"),
    beat: {
      kind: "shot",
      shot: { ...img("a47-admin-integracoes", 1280, 1643), focus: { x: 0.17, y: 0.21, w: 0.7, h: 0.19 } },
      title: "Integrações",
      text: "API, webhooks e agentes de IA [por MCP.]",
    },
  },
  {
    number: "07",
    title: "Proteger",
    tagline: "Mais seguro [a cada versão.]",
    photo: foto("pessoa-trio"),
    beat: {
      kind: "cards",
      title: "Segurança [nova]",
      cards: [
        { icon: "key", name: "Dois passos", text: "Um código da app a cada entrada" },
        { icon: "badge", name: "Conta da instituição", text: "Entrar com o login de sempre" },
        { icon: "folder", name: "Pastas com leitores", text: "Cada pasta diz quem a lê" },
        { icon: "layers", name: "Versões de ficheiros", text: "Substituir sem perder o anterior" },
      ],
    },
  },
];

export const closing = {
  title: "CMS TIS",
  line: "A intranet da sua instituição, [num só lugar.]",
  cta: "tis.ao",
};
