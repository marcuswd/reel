# Backlog

Um item por linha, o primeiro não feito é o próximo. Critério de pronto em cada um.

- [x] Folha de contato automática falha no ffmpeg em alguns jobs (relatado no cms-tis-comercial). Pronto: `pnpm video stills` gera a folha para todos os jobs atuais, com teste do comando que falhava.
- [x] Testes do motor puro (`src/core/timeline.ts`, `srt.ts`, `schema.ts`) com o runner do Node. Pronto: `pnpm test` no CI cobrindo duração por cena, corte no tempo da música e legendas.
- [x] Legenda queimada repete o destaque da cena e às vezes fica com pouco contraste sobre o fundo. Pronto: regra clara de quando mostrar e contraste mínimo AA medido no still.
- [x] Trabalhar a partir da pasta do cliente: `job.json`, marca, material e entregas ficam na pasta do cliente (ex.: `C:\sites\<cliente>\videos\<slug>`), e o motor só lê dela e grava nela. Pronto: `pnpm video <comando> <pasta>` faz voice, build, stills e render sem criar nada em `jobs/`, `brands/`, `public/` ou `out/` deste repositório.
- [x] Validação de jobs e marcas sem renderizar (`pnpm video check <pasta>`), sobre a pasta do job. Pronto: job inválido falha com mensagem que diz o campo; material ausente é listado.
- [ ] Revisar `scripts/video.ts` (arquivo grande) só se um item acima exigir; não refatorar por refatorar.
- [x] Modo dark, fatia 1 (0.9.0): cena `dark3d` (corredor, poeira, vazio), receitas `noir-frio` e `curiosidades` com `video new --recipe`, mood `drone`, skill `reel:dark`. Desenho em `docs/equipa/propostas/modo-dark.md`.
- [ ] Modo dark, depois da fatia 1: ambientes `planeta`, `monolitos`, `linha-do-tempo`; receitas `brasa`, `neon-vazio`, `misterio`, `explicacao`.
- [ ] Modo dark: formato longo 16:9 com esqueleto de capítulos.
- [ ] Modo dark: comando `video dark-plan` (roteiro para job sem passar pela skill) e comandos de ajuste de cena.
- [ ] Modo dark: `PUBLICAR.md` gerado com checklist por plataforma.
- [ ] Modo dark: campo `pause` por cena e velocidade para vozes pagas.
- [ ] Modo dark: texto 3D extrudado com a fonte da marca; brilho real (EffectComposer) se o falso não bastar.
- [ ] Modo dark: amostra de voz para escolha e estimativa de custo antes da voz paga.

## Dívidas conhecidas

- Cenas `list` e `stats` ficam pequenas e coladas no topo em 9:16.
- `render` não gera o CREDITOS.md base; a skill `reel:dark` escreve à mão a partir do `recipe.json`.
- QC marca "quadro escuro" em texto que entra depois de um fade pelo preto (possível falso positivo).
- No Git Bash do Windows o `tar` do sistema quebra o download de fonte.
- A poeira do `dark3d` não dá a volta (sem wrap): em cenas acima de uns 20 s as partículas acabam.
