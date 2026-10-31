# Material: cms-tis-comercial

Data: 2026-10-31. Pesquisa de material por Marina (ordem: o que o cliente já tem, depois o site, depois bancos).

## Ecrãs do produto (capturas próprias, dados de teste)

Fonte: painel do CMS TIS (administração) em http://localhost:4001, versão 0.129.4, instalação CSMJ 0.50.1 em ambiente de desenvolvimento. Conta de teste de administrador (sem senha registada aqui). Só leitura, nenhum dado alterado. Licença: produto próprio da TIS, sem crédito obrigatório.

Pastas com capturas anteriores (não copiadas, ver "Não usado"): `tis-cms-server/docs/equipa/autonomo/revisao-visual-do-painel-juntar-palavra--2026-10-31/depois/`.

| Caminho local (public/) | O que mostra | Formato | Uso |
|---|---|---|---|
| cms-tis-comercial/img/painel-1440.png | Painel: contagem de notícias por estado, notícias recentes, próximos eventos, contas por perfil | 1440x900 | browser |
| cms-tis-comercial/img/painel-390.png | Painel em telemóvel | 390x844 | celular (9:16) |
| cms-tis-comercial/img/listagem-noticias-1440.png | Listagem de notícias com idioma (pt-AO, "+Adicionar idioma"), estado, publicação, autor | 1440x900 | browser |
| cms-tis-comercial/img/listagem-noticias-390.png | Listagem em telemóvel (colunas reduzidas) | 390x844 | celular |
| cms-tis-comercial/img/fluxos-aprovacao-1440.png | Fluxos de aprovação (lista de fluxos, responsável, prazo, publicar, editar) | 1440x900 | browser |
| cms-tis-comercial/img/fluxos-aprovacao-390.png | Fluxos em telemóvel | 390x844 | celular |
| cms-tis-comercial/img/auditoria-1440.png | Trilha de auditoria: quando, quem, acção, entidade, registo | 1440x900 | browser |
| cms-tis-comercial/img/definicoes-1440.png | Definições: instalação, idiomas (pt-AO, inglês), funcionalidades (reacções, IA, newsletter, enquetes) | 1440x900 | browser |
| cms-tis-comercial/img/enquetes-1440.png | Enquetes (lista com estado e datas) | 1440x900 | browser |
| cms-tis-comercial/img/eventos-1440.png | Eventos (tipo, data, estado) | 1440x900 | browser |
| cms-tis-comercial/img/paginas-1440.png | Páginas (idiomas, estado, modelo) | 1440x900 | browser |
| cms-tis-comercial/img/orgaos-sistema-judicial-1440.png | Órgãos do sistema (lista com tipo, província) | 1440x900 | browser; próximo do "organograma" |

## Folhas de contacto (ffmpeg)

- out/cms-tis-comercial/folha-contacto-1440.png: 10 capturas 1440, numeradas 01 a 10 (ordem alfabética do ficheiro).
- out/cms-tis-comercial/folha-contacto-390.png: 3 capturas 390, numeradas 01 a 03.

## Logo e cores

- brands/tis.json: logo `cms/brand/tis-logo-branca.svg` (clara), `cms/brand/tis-logo.svg` (escura), `cms/brand/tis-mark.svg`. Os três ficheiros existem em public/cms/brand/. Teste de render (Chromium) OK: logo claro sobre #04165D e escuro sobre branco (out/cms-tis-comercial/logo-tis-teste.png).
- Cores em brands/tis.json: bg #04165D, primary #036EF2, accent #00AAFF, muted #B9C8EC.
- packages/ui/src/tokens.css: só mapeia tokens --ds-* (sem valores hex). Os valores hex não foram confirmados contra a fonte do design system; vale a brands/tis.json.
- Fontes: Archivo (public/cms/fonts, 300/400/500/700 em woff2).

## Não usado

- Capturas antigas 1280 e 375 da revisão visual: não copiadas. Têm o indicador "N" do Next sobre o menu e, na notícia, o aviso "Não foi possível carregar o aspecto do portal" (portal :4002 parado).
- Editor de notícia (histórico de versões, traduções, agendamento): não capturado. Mesmo aviso do portal aparece no editor, por isso não entrou.
- public/cms-tis-comercial/img/biblioteca-1440.png: apagada. Miniaturas partidas (imagens de banco de teste sem ficheiro).

## Pendências

- Lacunas de ecrã: histórico de versões, publicação agendada (não há notícias agendadas nos dados de teste) e organograma (não existe ecrã próprio; usei órgãos do sistema). Para cobrir, precisa de dados de teste e do portal :4002 de pé, ou de maquetar.
- Dados: a listagem de notícias e o painel mostram notícias reais do cliente CSMJ (títulos publicados). Decidir se o vídeo de venda pode mostrá-las ou se se substitui por dados de exemplo.
- Não há pessoas nem bancos de fotos neste material. Nenhum crédito CC a registar.
