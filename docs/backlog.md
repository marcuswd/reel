# Backlog

Um item por linha, o primeiro não feito é o próximo. Critério de pronto em cada um.

- [x] Folha de contato automática falha no ffmpeg em alguns jobs (relatado no cms-tis-comercial). Pronto: `pnpm video stills` gera a folha para todos os jobs atuais, com teste do comando que falhava.
- [x] Testes do motor puro (`src/core/timeline.ts`, `srt.ts`, `schema.ts`) com o runner do Node. Pronto: `pnpm test` no CI cobrindo duração por cena, corte no tempo da música e legendas.
- [x] Legenda queimada repete o destaque da cena e às vezes fica com pouco contraste sobre o fundo. Pronto: regra clara de quando mostrar e contraste mínimo AA medido no still.
- [x] Trabalhar a partir da pasta do cliente: `job.json`, marca, material e entregas ficam na pasta do cliente (ex.: `C:\sites\<cliente>\videos\<slug>`), e o motor só lê dela e grava nela. Pronto: `pnpm video <comando> <pasta>` faz voice, build, stills e render sem criar nada em `jobs/`, `brands/`, `public/` ou `out/` deste repositório.
- [x] Validação de jobs e marcas sem renderizar (`pnpm video check <pasta>`), sobre a pasta do job. Pronto: job inválido falha com mensagem que diz o campo; material ausente é listado.
- [ ] Revisar `scripts/video.ts` (arquivo grande) só se um item acima exigir; não refatorar por refatorar.
