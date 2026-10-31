// Roteiro da v2: capítulos por funcionalidade. Edite os textos aqui.
// [colchetes] = palavras com marcador âmbar.
import type { Shot } from "./Screen";

const img = (name: string, iw = 1280, ih = 800) => ({ src: `cms/${name}.png`, iw, ih });

export type Beat =
  | { kind: "shot"; shot: Shot; title: string; text: string }
  | { kind: "split"; shot: Shot; title: string; items: string[]; card?: Shot };

export type Chapter = { number: string; title: string; tagline: string; beats: Beat[] };

export const cover = {
  eyebrow: "TIS apresenta",
  title: "CMS TIS",
  support: "A intranet da sua instituição, [num só lugar.]",
  backdrop: img("p02-portal-inicio"),
};

export const whatIs = {
  eyebrow: "O que é",
  headline: "Uma intranet onde cada pessoa vê [o que é seu.]",
  pillars: [
    { name: "Portal", who: "Colaboradores", text: "Ler, pedir e participar, no computador ou no telemóvel." },
    { name: "Painel", who: "Quem gere", text: "Publicar e gerir pessoas, unidades e aprovações." },
    { name: "Motor", who: "Por trás", text: "Uma API única que decide o que cada um pode ver e fazer." },
  ],
};

export const chapters: Chapter[] = [
  {
    number: "01",
    title: "Comunicar",
    tagline: "Notícias, eventos e newsletter chegam a [quem devem chegar.]",
    beats: [
      {
        kind: "shot",
        shot: { ...img("p02-portal-inicio"), focus: { x: 0, y: 0.07, w: 0.67, h: 0.43 } },
        title: "Página de início",
        text: "A notícia mais recente, o próximo evento e os aniversariantes, [num só olhar.]",
      },
      {
        kind: "shot",
        shot: { ...img("a04-admin-noticia-editar"), focus: { x: 0.17, y: 0.1, w: 0.8, h: 0.5 } },
        title: "Editor de texto rico",
        text: "Tabelas, imagens, vídeos e anexos. [Cola do Word] sem perder a forma.",
      },
    ],
  },
  {
    number: "02",
    title: "Pedir e aprovar",
    tagline: "Férias, salas, qualquer pedido: [digital e por passos.]",
    beats: [
      {
        kind: "shot",
        shot: { ...img("p08-portal-pedidos"), focus: { x: 0, y: 0.24, w: 1, h: 0.56 } },
        title: "Pedidos",
        text: "Formulários internos com [aprovação por passos] e histórico de cada estado.",
      },
      {
        kind: "split",
        shot: img("a14-admin-fluxo-editar"),
        card: img("p18-portal-precisa-de-si", 440, 520),
        title: "Aprovar sem sair do início",
        items: ["Aprovar, devolver ou recusar, com comentário", "Ninguém decide os próprios pedidos", "Fluxos por superior, cargo ou pessoa"],
      },
    ],
  },
  {
    number: "03",
    title: "Encontrar",
    tagline: "Tudo o que a pessoa pode ler, [a uma pesquisa de distância.]",
    beats: [
      {
        kind: "shot",
        shot: { ...img("p22-portal-sugestoes", 1440, 900), focus: { x: 0.6, y: 0.0, w: 0.38, h: 0.78 } },
        title: "Pesquisa global",
        text: "Notícias, eventos, pessoas e o texto [dentro de Word, Excel e PowerPoint.]",
      },
    ],
  },
  {
    number: "04",
    title: "Ouvir",
    tagline: "Dar voz aos colaboradores, [com anonimato garantido.]",
    beats: [
      {
        kind: "split",
        shot: { ...img("p24-portal-enquetes", 1440, 1148), pan: true, panTo: 0.45 },
        title: "Enquetes",
        items: ["Voto nominal ou anónimo", "Uma ou várias opções", "Resultados quando a enquete fecha"],
      },
    ],
  },
  {
    number: "05",
    title: "Gerir com controlo",
    tagline: "Cada mudança registada, [cada pessoa no seu âmbito.]",
    beats: [
      {
        kind: "shot",
        shot: { ...img("a16-admin-auditoria"), focus: { x: 0.15, y: 0.14, w: 0.85, h: 0.56 } },
        title: "Auditoria",
        text: "Quem fez o quê e quando, num registo [que não se reescreve.]",
      },
      {
        kind: "split",
        shot: { ...img("a25-admin-indicadores", 1440, 1759), pan: true, panTo: 0.8 },
        title: "Indicadores e permissões",
        items: ["Adesão ao portal e conteúdos mais lidos", "Perfis e permissões por unidade", "Uma pessoa a editar de cada vez"],
      },
    ],
  },
];

// Fotos de banco de imagens em public/cms/pessoas (pessoa-1.jpg …).
// Lista vazia = a cena "Pessoas" sai do vídeo.
export const pessoas: string[] = [];

export const people = {
  eyebrow: "Para quem",
  title: "Feito para quem faz a instituição.",
  line: "Menos emails perdidos, [mais tempo para o que importa.]",
};

export const security = {
  eyebrow: "Segurança",
  title: "Seguro por construção.",
  note: "Auditoria de 04/10/2026: cada ponto fechou com [um teste que o vigia.]",
  points: [
    "Sessão de 12 horas",
    "Bloqueio após 10 tentativas",
    "Injecção de SQL fechada",
    "Texto rico sempre limpo",
    "Enquetes realmente anónimas",
    "Contentores sem root",
  ],
};

export const platform = {
  eyebrow: "Plataforma",
  title: "Pronto a crescer.",
  tech: ["Next.js", "React", "Node.js", "PostgreSQL", "Docker", "ds-tis"],
  line: "Cada instituição entra como uma instalação, [sem mudar o código do produto.]",
};

export const closing = {
  title: "CMS TIS",
  line: "A intranet da sua instituição, num só lugar.",
  footer: "TIS",
};
