# Backlog

Um item por linha, o primeiro não feito é o próximo. Critério de pronto em cada um.

- [x] Folha de contato automática falha no ffmpeg em alguns jobs (relatado no cms-tis-comercial). Pronto: `pnpm video stills` gera a folha para todos os jobs atuais, com teste do comando que falhava.
- [x] Testes do motor puro (`src/core/timeline.ts`, `srt.ts`, `schema.ts`) com o runner do Node. Pronto: `pnpm test` no CI cobrindo duração por cena, corte no tempo da música e legendas.
- [ ] Legenda queimada repete o destaque da cena e às vezes fica com pouco contraste sobre o fundo (ver folha do `demo-30s`). Pronto: regra clara de quando mostrar e contraste mínimo AA medido no still.
- [ ] Validação de jobs e marcas sem renderizar (`pnpm video check`), usada no CI para todos os jobs. Pronto: job inválido falha com mensagem que diz o campo.
- [ ] O `showcase` (exemplo próprio, no git) usa material de clientes fora do git (`public/cms`, `public/mais-sabor`): num clone limpo os stills falham. Pronto: o showcase só usa assets em `public/showcase` ou `public/brands/marcuswd`, e o CI roda `pnpm video stills showcase`.
- [ ] Revisar `scripts/video.ts` (arquivo grande) só se um item acima exigir; não refatorar por refatorar.
