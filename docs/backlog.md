# Backlog

Um item por linha, o primeiro não feito é o próximo. Critério de pronto em cada um.

- [x] Folha de contato automática falha no ffmpeg em alguns jobs (relatado no cms-tis-comercial). Pronto: `pnpm video stills` gera a folha para todos os jobs atuais, com teste do comando que falhava.
- [x] Testes do motor puro (`src/core/timeline.ts`, `srt.ts`, `schema.ts`) com o runner do Node. Pronto: `pnpm test` no CI cobrindo duração por cena, corte no tempo da música e legendas.
- [x] Legenda queimada repete o destaque da cena e às vezes fica com pouco contraste sobre o fundo. Pronto: regra clara de quando mostrar e contraste mínimo AA medido no still.
- [x] Trabalhar a partir da pasta do cliente: `job.json`, marca, material e entregas ficam na pasta do cliente (ex.: `C:\sites\<cliente>\videos\<slug>`), e o motor só lê dela e grava nela. Pronto: `pnpm video <comando> <pasta>` faz voice, build, stills e render sem criar nada em `jobs/`, `brands/`, `public/` ou `out/` deste repositório.
- [x] Validação de jobs e marcas sem renderizar (`pnpm video check <pasta>`), sobre a pasta do job. Pronto: job inválido falha com mensagem que diz o campo; material ausente é listado.
- [ ] Revisar `scripts/video.ts` (arquivo grande) só se um item acima exigir; não refatorar por refatorar.
- [x] Modo dark, fatia 1 (0.10.0): cena `dark3d` (corredor, poeira, vazio), receitas `noir-frio` e `curiosidades` com `video new --recipe`, mood `drone`, skill `reel:dark`. Desenho em `docs/equipa/propostas/modo-dark.md`.
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
- `brand new --from <site>` falha com 429 do site e não tenta de novo nem segue com a marca padrão; o erro sai sem dizer o que fazer. Pronto: uma nova tentativa com espera e, se persistir, aviso claro e criação do brand.json padrão para completar à mão.
- `brand new` sem `--name` usa o nome da pasta (ex.: `videos`) como slug e nome da marca; num cliente isso gera marca chamada "videos". Pronto: o nome vem do cadastro do cliente ou pede o `--name`.

- `brand font` falha no Windows quando o `tar` do PATH é o do Git Bash (trata `C:\...` como host remoto: "Cannot connect to C"). Usar o tar do sistema (`C:\Windows\System32\tar.exe`) por caminho completo em `scripts/brand.ts` (cmdFont).

- [ ] Cena list sai pequena e alinhada à esquerda em 9:16, sem campo de escala. Pronto: a cena list ocupa a largura e a altura úteis do 9:16, centralizada, com escala configurável por campo do schema, validada em still 1080x1920 legível a olho nu.

- [ ] Cena cta em 9:16: o botão ocupa quase a largura toda (margem de uns 16 px em 540) e invade a zona segura lateral de Reels. Pronto: botão com largura máxima dentro da zona segura (cerca de 6% por lado), texto quebra em duas linhas se precisar.
- [ ] Cena kinetic `pop` no still: o quadro mostra só a última palavra ("negócio") e a frase inteira não aparece; escolher o quadro do still onde o texto está completo. Pronto: still da kinetic mostra a frase inteira.
- [ ] Fundos `mesh` e `aurora` sem `colors` clareiam o centro (cinza claro) e derrubam o contraste do texto laranja. Pronto: padrão do fundo respeita a luminosidade do `bg` da marca, ou aviso no check quando o contraste do texto cai abaixo de 4,5.

- Render com `--dest <pasta>` cria subpasta com a data dentro do destino (`<dest>\2026-11-09\`), em vez de gravar direto em `<dest>`. Também não gerou .srt/.vtt/CREDITOS.md neste job (sem legenda/crédito no job, a confirmar).

- audio:search --type sfx usa category=sound_effect no Openverse e devolve sempre vazio (sem category funciona); sem retentativa nem mensagem para 429/Cloudflare (limite anônimo muito baixo: um get a cada alguns minutos). Pedir FREESOUND_TOKEN ou tratar 429 com espera.

- [ ] `trilha generate` soa igual entre vídeos: variar por seed/job, mais timbres e padrões por mood. Pronto: dois jobs com o mesmo mood e seeds diferentes geram trilhas audivelmente distintas, medido por diferença de espectro/estrutura, e o mood escolhe entre ao menos 3 padrões.
- [ ] Pack de sfx padrão pequeno: mais variações por nome e escolha aleatória por seed. Pronto: cada nome tem 3 ou mais variações e a escolha varia por seed do job de forma reproduzível.
- [ ] `sfx.pack` customizado exige todos os nomes que o plano usa (whoosh-2, whoosh-soft, swoosh, glitch, pop-soft, hit-soft, click, além de impact/tick/riser) e o check não avisa os que faltam; no render o Audio falha ou fica mudo. Pronto: `video check` lista os efeitos do plano ausentes no pack, ou o motor cai no pack padrão por nome.
- [ ] Render não gera CREDITOS.md quando a trilha é `music.mode: file` (CC BY exige crédito). Pronto: `music.credit` no job (ou leitura de credits.json do áudio) gera CREDITOS.md na entrega.
