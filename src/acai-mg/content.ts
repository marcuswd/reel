// Roteiro do vídeo institucional da Distribuidora de Açaí MG (status do WhatsApp, 9:16).
// Todo texto do vídeo fica aqui. Palavras entre [colchetes] ganham destaque de cor.
// Textos tirados de distribuidoradeacaimg.com.br.

export const img = (name: string) => `distribuidora-acai-mg/img/${name}`;

export const content = {
  abertura: {
    tagline: "Qualidade da produção até a [entrega]",
  },
  polpas: {
    title: "As [melhores polpas] para fabricação do seu [creme de açaí]",
    selo: ["Açaí", "12%"],
    produtos: [img("p-nalto.png"), img("p-fazenda.png"), img("p-para.png")],
  },
  frutas: {
    title: "Qual é a sua [fruta preferida?]",
    frutas: ["Morango", "Mirtilo", "Framboesa", "Amora", "Maracujá", "Acerola", "Abacaxi"],
    sub: "As melhores frutas congeladas para o seu negócio",
    imagem: img("fc-05-1.png"),
  },
  xarope: {
    title: "Xarope de Guaraná",
    destaque: "na sua marca!",
    etiqueta: "SUA MARCA",
    sub: "Mais credibilidade para o seu produto",
    imagem: img("fc-05-3.png"),
  },
  entregas: {
    title: "Entregas [Atacado e Varejo]",
    sub: "Carros refrigerados para manter a qualidade do produto",
    chip: "Pronta entrega pontual",
    imagem: img("fc-06-2.png"),
  },
  diferenciais: {
    itens: ["Garantia de Qualidade", "Bom Atendimento", "Excelentes Preços"],
    rodape: "Atendemos todo o estado de [Minas Gerais]",
  },
  cta: {
    title: "Faça seu [pedido!]",
    whatsapp: "(31) 98864-7029",
    site: "distribuidoradeacaimg.com.br",
    local: "Belo Horizonte • MG",
  },
  logo: img("logo.png"),
} as const;
