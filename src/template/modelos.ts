// Catálogo de referências: roteiros prontos por segmento, para pequenas e médias empresas começarem um vídeo bom
// sem partir do zero. `pnpm video new <pasta> --brand <marca> --modelo <id>` cria o job a partir de um deles;
// `pnpm video modelos` lista. São só roteiros (cenas, ritmo, trilha): nenhum material de cliente mora aqui.
// O material de cada cena (fotos, vídeos, prints) vem do cliente ou de banco gratuito; "material" diz o que pedir.
// Textos com [destaque] usam a cor de destaque da marca. Troque os textos pelos do cliente, mantenha o ritmo.
import type { z } from "zod";
import type { jobSchema } from "../core/schema";

type Job = z.input<typeof jobSchema>;
export type Modelo = {
  id: string;
  nome: string;
  para: string;
  duracao: string;
  formatos: string[];
  mood: string;
  pace: "calm" | "normal" | "fast";
  material: string[];
  cenas: Job["scenes"];
};

export const MODELOS: Modelo[] = [
  {
    id: "loja",
    nome: "Loja e produto",
    para: "varejo, e-commerce e lojas de bairro mostrando um produto ou uma coleção com oferta",
    duracao: "15 s",
    formatos: ["9:16", "1:1"],
    mood: "upbeat",
    pace: "fast",
    material: ["3 a 5 fotos do produto em fundo limpo (img/produto-1.jpg ...)", "logo", "oferta (preço ou condição)", "WhatsApp ou link da loja"],
    cenas: [
      { id: "gancho", type: "kinetic", text: "Chegou o que [você] estava esperando", style: "pop" },
      { id: "produto", type: "media", media: "img/produto-1.jpg", title: "Nome do [produto]", camera: "push" },
      { id: "colecao", type: "gallery", items: ["img/produto-2.jpg", "img/produto-3.jpg", "img/produto-4.jpg"], layout: "carousel", title: "Escolha o [seu]" },
      { id: "oferta", type: "statement", text: "Só esta semana: [10% off] no Pix" },
      { id: "cta", type: "cta", title: "Peça pelo [WhatsApp]", button: "Comprar agora", contact: [{ kind: "whatsapp", value: "(00) 00000-0000" }], logo: true },
    ],
  },
  {
    id: "restaurante",
    nome: "Restaurante e delivery",
    para: "restaurantes, lanchonetes, padarias e delivery mostrando pratos e o jeito de pedir",
    duracao: "15 s",
    formatos: ["9:16", "1:1"],
    mood: "upbeat",
    pace: "fast",
    material: ["3 a 4 fotos ou vídeos curtos dos pratos (img/prato-1.jpg ... ou video/prato.mp4)", "logo", "horário e bairros de entrega", "link do cardápio ou WhatsApp"],
    cenas: [
      { id: "gancho", type: "kinetic", text: "Fome de [quê] hoje?", style: "stack" },
      { id: "prato", type: "media", media: "img/prato-1.jpg", title: "O [mais pedido] da casa", camera: "in" },
      { id: "cardapio", type: "gallery", items: ["img/prato-2.jpg", "img/prato-3.jpg", "img/prato-4.jpg"], layout: "grid" },
      { id: "entrega", type: "list", title: "Do jeito [que você quer]", items: ["Entrega no seu bairro", "Retirada no balcão", "Pix e cartão"] },
      { id: "cta", type: "cta", title: "Peça [agora]", button: "Ver cardápio", contact: [{ kind: "whatsapp", value: "(00) 00000-0000" }], logo: true },
    ],
  },
  {
    id: "imovel",
    nome: "Imóvel",
    para: "corretores e imobiliárias apresentando um imóvel com os números que importam",
    duracao: "15 a 20 s",
    formatos: ["9:16", "16:9"],
    mood: "calm",
    pace: "normal",
    material: ["5 a 8 fotos do imóvel na ordem da visita (img/1.jpg ...)", "metragem, quartos, vagas e preço", "bairro (para o mapa)", "contato do corretor"],
    cenas: [
      { id: "capa", type: "cover", title: "Seu próximo [endereço]", subtitle: "Bairro, cidade", media: "img/1.jpg" },
      { id: "numeros", type: "stats", items: [{ value: 120, suffix: " m²", label: "área" }, { value: 3, label: "quartos" }, { value: 2, label: "vagas" }] },
      { id: "ambientes", type: "gallery", items: ["img/2.jpg", "img/3.jpg", "img/4.jpg", "img/5.jpg"], layout: "stack" },
      { id: "local", type: "map", points: [{ lat: -19.93, lng: -44.05, label: "O imóvel" }], route: false, title: "Perto de [tudo]" },
      { id: "cta", type: "cta", title: "Agende sua [visita]", button: "Quero visitar", contact: [{ kind: "whatsapp", value: "(00) 00000-0000" }], logo: true },
    ],
  },
  {
    id: "servico",
    nome: "Serviço local",
    para: "salões, clínicas, oficinas, escritórios e prestadores mostrando o que fazem e por que confiar",
    duracao: "15 s",
    formatos: ["9:16", "1:1"],
    mood: "corporate",
    pace: "normal",
    material: ["2 a 3 fotos ou vídeos do espaço ou do serviço sendo feito, sem rostos sem autorização (img/servico-1.jpg ...)", "3 diferenciais", "um número que dá confiança (anos, clientes atendidos)", "contato"],
    cenas: [
      { id: "gancho", type: "statement", text: "Cansado de [esperar] para ser atendido?" },
      { id: "servico", type: "split", media: "img/servico-1.jpg", title: "Atendimento [no horário]", bullets: ["Agendamento online", "Equipe certificada", "Garantia no serviço"] },
      { id: "confianca", type: "stats", items: [{ value: 12, label: "anos de casa" }, { value: 3000, prefix: "+", label: "clientes atendidos" }] },
      { id: "cta", type: "cta", title: "Agende [hoje]", button: "Agendar", contact: [{ kind: "whatsapp", value: "(00) 00000-0000" }, { kind: "instagram", value: "@seuperfil" }], logo: true },
    ],
  },
  {
    id: "lancamento",
    nome: "Lançamento e promoção",
    para: "anunciar um produto, serviço, evento ou campanha com data e chamada forte",
    duracao: "15 s",
    formatos: ["9:16", "16:9"],
    mood: "epic",
    pace: "fast",
    material: ["1 imagem ou objeto principal (img/destaque.png, de preferência com fundo transparente)", "data ou prazo", "3 motivos para não perder", "link ou WhatsApp"],
    cenas: [
      { id: "gancho", type: "kinetic", text: "Vem [aí]", style: "pop" },
      { id: "destaque", type: "object3d", object: "box", media: "img/destaque.png", title: "Nome do [lançamento]" },
      { id: "motivos", type: "list", title: "Por que [não perder]", items: ["Primeiro motivo", "Segundo motivo", "Terceiro motivo"] },
      { id: "data", type: "statement", text: "A partir de [00/00]" },
      { id: "cta", type: "cta", title: "Garanta o [seu]", button: "Quero", contact: [{ kind: "site", value: "seusite.com.br" }], logo: true },
    ],
  },
];

export const modelo = (id: string): Modelo | undefined => MODELOS.find((m) => m.id === id);
