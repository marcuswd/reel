// Roteiro da v4. [colchetes] = palavras em destaque (cor de acento).
// As durações saem do tempo de leitura (theme.ts), não estão fixas aqui.
import type { Shot } from "./Screen";

const img = (name: string, iw = 1280, ih = 800) => ({ src: `cms/${name}.png`, iw, ih });
const foto = (name: string) => `cms/pessoas/${name}.jpg`;

export type Beat =
  | { kind: "shot"; shot: Shot; title: string; text: string }
  | { kind: "split"; title: string; items: string[]; shot?: Shot; photo?: string; card?: Shot };

export type Chapter = { number: string; title: string; tagline: string; photo: string; beats: Beat[] };

export const cover = {
  eyebrow: "TIS apresenta",
  title: "CMS TIS",
  support: "A intranet da sua instituição, [num só lugar.]",
  photo: foto("pessoa-retrato"),
};

export const whatIs = {
  eyebrow: "O que é",
  headline: "Uma intranet onde cada pessoa vê [o que é seu.]",
  pillars: [
    { name: "Portal", text: "Lê, pede e participa." },
    { name: "Painel", text: "Publica e gere." },
    { name: "Motor", text: "Decide quem vê o quê." },
  ],
};

export const people = {
  eyebrow: "Para quem",
  title: "Feito para [quem faz] a instituição.",
  line: "Menos emails perdidos, mais tempo para o que importa.",
  photos: [foto("pessoa-trio"), foto("pessoa-equipa"), foto("pessoa-conversa")],
};

export const chapters: Chapter[] = [
  {
    number: "01",
    title: "Comunicar",
    tagline: "Notícias, eventos e newsletter chegam [a quem devem chegar.]",
    photo: foto("pessoa-conversa"),
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
        text: "Tabelas, imagens e vídeos. [Cola do Word] sem perder a forma.",
      },
    ],
  },
  {
    number: "02",
    title: "Pedir e aprovar",
    tagline: "Férias, salas, qualquer pedido: [digital e por passos.]",
    photo: foto("pessoa-reuniao"),
    beats: [
      {
        kind: "shot",
        shot: { ...img("p08-portal-pedidos"), focus: { x: 0, y: 0.22, w: 0.7, h: 0.45 } },
        title: "Pedidos",
        text: "Formulários internos com [aprovação por passos] e histórico.",
      },
      {
        kind: "split",
        photo: foto("pessoa-trio"),
        card: img("p18-portal-precisa-de-si", 440, 520),
        title: "Aprovar sem sair do início",
        items: ["Aprovar, devolver ou recusar", "Ninguém decide os próprios pedidos", "Fluxos por superior, cargo ou pessoa"],
      },
    ],
  },
  {
    number: "03",
    title: "Encontrar",
    tagline: "Tudo o que pode ler, [a uma pesquisa de distância.]",
    photo: foto("pessoa-equipa"),
    beats: [
      {
        kind: "shot",
        shot: { ...img("p22-portal-sugestoes", 1440, 900), focus: { x: 0.6, y: 0.0, w: 0.38, h: 0.78 } },
        title: "Pesquisa global",
        text: "Notícias, pessoas e o texto [dentro de Word e Excel.]",
      },
    ],
  },
  {
    number: "04",
    title: "Ouvir",
    tagline: "Dar voz às pessoas, [com anonimato garantido.]",
    photo: foto("pessoa-retrato"),
    beats: [
      {
        kind: "split",
        photo: foto("pessoa-reuniao"),
        card: { ...img("p24-portal-enquetes", 1440, 1148) },
        title: "Enquetes e clima",
        items: ["Voto nominal ou anónimo", "Resultados só com 10 ou mais respostas", "Ninguém é identificado"],
      },
    ],
  },
  {
    number: "05",
    title: "Gerir com controlo",
    tagline: "Cada mudança registada, [cada pessoa no seu âmbito.]",
    photo: foto("pessoa-trio"),
    beats: [
      {
        kind: "shot",
        shot: { ...img("a16-admin-auditoria"), focus: { x: 0.15, y: 0.14, w: 0.85, h: 0.56 } },
        title: "Auditoria",
        text: "Quem fez o quê e quando, [num registo que não se reescreve.]",
      },
      {
        kind: "split",
        shot: { ...img("a25-admin-indicadores", 1440, 1759), pan: true, panTo: 0.8 },
        title: "Indicadores e permissões",
        items: ["Adesão e conteúdos mais lidos", "Permissões por perfil e unidade", "Uma pessoa a editar de cada vez"],
      },
    ],
  },
];

export const security = {
  eyebrow: "Segurança",
  title: "Seguro [por construção.]",
  stats: [
    { n: 12, suffix: " h", label: "de sessão, no máximo" },
    { n: 10, suffix: "", label: "tentativas e a conta bloqueia" },
    { n: 100, suffix: "%", label: "das consultas parametrizadas" },
    { n: 0, suffix: "", label: "votos identificáveis" },
  ],
  note: "Auditada, e [vigiada por testes.]",
};

export const platform = {
  eyebrow: "Plataforma",
  title: "Pronto [a crescer.]",
  tech: ["Next.js", "React", "Node.js", "PostgreSQL", "Docker", "ds-tis"],
  line: "Cada instituição entra como uma instalação, [sem mudar o código do produto.]",
};

export const closing = {
  title: "CMS TIS",
  line: "A intranet da sua instituição, [num só lugar.]",
  cta: "tis.ao",
};
