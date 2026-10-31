// Roteiro do vídeo comercial do CMS TIS.
// Textos tirados de docs/funcionalidades (tis-cms-server), em português de Angola/Portugal
// como o resto do produto. Edite aqui sem tocar nas cenas.

export type TechItem = { name: string; version: string; desc: string };
export type Group = {
  id: string;
  number: string;
  title: string;
  tagline: string;
  tech?: TechItem[];
  features?: { title: string; items: string[]; image?: string; image2?: string; diagram?: boolean }[];
};

export const cover = {
  eyebrow: "TIS apresenta",
  title: "CMS TIS",
  support: "A intranet da sua instituição, num só lugar.",
};

export const whatIs = {
  eyebrow: "O que é",
  headline: "Um CMS feito para a intranet de instituições.",
  pillars: [
    { name: "Portal", who: "Para os colaboradores", text: "Notícias, eventos, pedidos e participação, no computador ou no telemóvel." },
    { name: "Painel", who: "Para quem escreve e gere", text: "Publicar conteúdos e gerir pessoas, unidades e fluxos de aprovação." },
    { name: "Motor", who: "Por trás de tudo", text: "Uma API única que decide o que cada pessoa pode ver e fazer." },
  ],
};

export const screens = [
  { image: "cms/p02-portal-inicio.png", caption: "Portal do colaborador" },
  { image: "cms/a02-admin-painel.png", caption: "Painel de administração" },
  { image: "cms/a34-admin-editor-menu-mais.png", caption: "Editor de texto rico" },
];

export const groups: Group[] = [
  {
    id: "front",
    number: "01",
    title: "Front-end",
    tagline: "Portal e painel rápidos, no computador e no telemóvel.",
    tech: [
      { name: "Next.js", version: "16", desc: "Portal e painel com desenho no servidor" },
      { name: "React", version: "19", desc: "A interface de todas as páginas" },
      { name: "Tiptap", version: "3", desc: "O editor de texto rico do painel" },
      { name: "Leaflet", version: "1.9", desc: "Mapas dos eventos" },
      { name: "FullCalendar", version: "6", desc: "Calendário e agenda" },
      { name: "sharp", version: "0.35", desc: "Imagens no tamanho de cada ecrã" },
    ],
    features: [
      {
        title: "No portal, o colaborador encontra",
        image: "cms/p02-portal-inicio.png",
        image2: "cms/p21-portal-pesquisa.png",
        items: [
          "Página de início com notícias, eventos e aniversariantes",
          "Pedidos e aprovações digitais por passos",
          "Pesquisa global, até dentro de Word, Excel e PowerPoint",
          "Enquetes e pesquisa de clima anónimas",
          "Sino de notificações e newsletter",
        ],
      },
      {
        title: "No painel, quem gere tem",
        image: "cms/a04-admin-noticia-editar.png",
        image2: "cms/a09-admin-biblioteca.png",
        items: [
          "Rascunho, pedido de publicação, agendamento",
          "Histórico de versões e lixeira com desfazer",
          "Uma pessoa a editar de cada vez, sem perder trabalho",
          "Biblioteca de ficheiros que sabe onde cada um é usado",
          "Indicadores de adesão e auditoria",
        ],
      },
    ],
  },
  {
    id: "back",
    number: "02",
    title: "Back-end",
    tagline: "Um motor, uma API, todas as regras.",
    tech: [
      { name: "Node.js", version: "24", desc: "Execução do motor, do painel e do portal" },
      { name: "Fastify", version: "5", desc: "O servidor da API" },
      { name: "PostgreSQL", version: "15", desc: "Base de dados e pesquisa por texto" },
      { name: "Drizzle ORM", version: "0.45", desc: "Acesso à base e geração das migrações" },
      { name: "OpenAPI e Scalar", version: "", desc: "Todas as rotas documentadas e navegáveis" },
      { name: "Nodemailer", version: "10", desc: "Notificações e newsletter por SMTP" },
    ],
    features: [
      {
        title: "O que o motor garante",
        diagram: true,
        items: [
          "Âmbito por unidade: nacional ou de cada unidade",
          "Perfis e permissões verificados em cada pedido",
          "Fila de trabalhos para agendamentos e emails",
          "Cada cliente é uma instalação, sem mexer no produto",
        ],
      },
    ],
  },
  {
    id: "design",
    number: "03",
    title: "Design",
    tagline: "O design system da TIS em cada ecrã.",
    tech: [
      { name: "ds-tis", version: "1.0", desc: "O design system da TIS, no painel" },
      { name: "Tailwind CSS", version: "4", desc: "Estilos do portal e do painel" },
      { name: "Lucide", version: "", desc: "Ícones consistentes em todo o painel" },
      { name: "Geist e Inter", version: "", desc: "Tipografia servida pelas próprias aplicações" },
      { name: "Storybook", version: "10", desc: "Catálogo vivo dos componentes" },
    ],
    features: [
      {
        title: "A marca de cada instituição",
        image: "cms/p02-portal-inicio.png",
        image2: "cms/p20-newsletter-email.png",
        items: [
          "Nome, cores, logótipo e rodapé de cada cliente",
          "A mesma identidade no email da newsletter",
          "Painel em português e em inglês",
          "Pronto para o telemóvel, sem aplicação a instalar",
        ],
      },
    ],
  },
  {
    id: "infra",
    number: "04",
    title: "Infraestrutura",
    tagline: "Do código à produção, com o mesmo rigor.",
    tech: [
      { name: "Docker", version: "", desc: "Imagens e composição de produção" },
      { name: "Caddy", version: "2", desc: "Proxy de entrada com HTTPS automático" },
      { name: "GitLab CI", version: "", desc: "Pipeline de qualidade e registo das imagens" },
      { name: "pnpm", version: "11", desc: "Gestão do monorepo do motor" },
      { name: "Vitest", version: "4", desc: "Testes automáticos e cobertura" },
      { name: "Mailpit", version: "1.21", desc: "Correio de desenvolvimento e de teste" },
    ],
  },
  {
    id: "seguranca",
    number: "05",
    title: "Segurança",
    tagline: "Auditada, e vigiada por testes.",
    features: [
      {
        title: "Cada ponto da auditoria fechou com um teste que o vigia",
        image: "cms/a16-admin-auditoria.png",
        items: [
          "Sessão de 12 horas; o painel fecha ao fim de 2 horas parado",
          "Dez tentativas falhadas bloqueiam a conta 15 minutos",
          "Injecção de SQL fechada por construção",
          "Texto rico limpo no motor e outra vez no portal",
          "Enquetes anónimas: ninguém sabe em que alguém votou",
          "Auditoria que a aplicação não consegue reescrever",
        ],
      },
    ],
  },
];

export const closing = {
  title: "CMS TIS",
  line: "Uma instituição nova entra como uma instalação, sem mudar o código do produto.",
  footer: "TIS",
};
