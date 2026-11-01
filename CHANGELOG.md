# Changelog

## 0.5.0 (2026-10-31)

- Tudo de um vídeo mora na pasta do cliente. Todo comando recebe a pasta do job: `pnpm video new|build|voice|music|translate|plan|stills|render|studio <pasta>`. Lá ficam `job.json`, `i18n/`, material, locução, trilha, `_build/`, `out/` (stills e folhas) e `entregas/<data>/` (ou `--dest`). Nada é gravado no repositório.
- Marca: `brand.json` na pasta do job, na de cima (compartilhada pelos vídeos do cliente) ou em `../brands/<nome>.json`; ou `"brand": "caminho/brand.json"`. Fontes e logo ficam ao lado dela. `pnpm brand new|font|show <pasta>`.
- Caminhos de mídia no job e na marca são relativos às suas pastas (`img/foto.jpg`, `fonts/x.woff2`); `scripts/lib/workspace.ts` os traduz para a `public` do bundle. No render o material é copiado só para o bundle temporário (da pasta da marca, só os arquivos que o `brand.json` usa); no Studio entra por junction, sem cópia e sem exigir admin no Windows.
- `pnpm video studio <pasta>` abre o job no Studio e, ao fechar, esvazia de novo o `src/jobs.generated.ts`.
- `pnpm video new` não gera a trilha (sai no build/render, com as cenas de verdade).
- Saem `EXPORT_DIR`, `scripts/export.mjs` e `pnpm export`: a entrega já sai na pasta do job.
- Testes da pasta do job e teste de ponta a ponta (`REEL_E2E=1`, ligado no CI): pasta temporária de cliente → new, stills e render, conferindo que o repositório não muda.

## 0.4.0 (2026-10-31)

- O repositório passa a levar só o motor. Saem todas as marcas (`brands/*.json`), todos os jobs (`jobs/*`, inclusive os exemplos `demo-30s` e `showcase`) e o material versionado (`public/brands/marcuswd`, `public/demo-30s`, `public/showcase`). O `.gitignore` exclui `jobs/`, `brands/` e `public/*` (menos `_lib`).
- A composição padrão do Studio (`src/template/demo.ts`) usa uma marca neutra embutida em vez da marca MARCUSWD.
- `pnpm video new` exige `--brand`.
- CI: typecheck e testes (sem build de exemplos).
- Documentação: entrega na pasta do cliente com `render --dest`; verificação visual do motor pelo still da composição padrão.

## 0.3.0 (2026-10-31)

- Legenda queimada só quando acrescenta: a legenda da locução não é queimada nas cenas em que 60% ou mais das palavras faladas já estão escritas na tela (`captions.whenOnScreen`, padrão `"hide"`; `"show"` volta ao comportamento anterior). O `.srt`/`.vtt` continua completo; vídeo falado é sempre queimado. Sem nada para queimar, a faixa reservada embaixo some.
- Contraste AA em todo estilo de legenda: placa preta a 62% (branco passa no AA até sobre fundo branco) e palavra falada em pílula na cor de destaque, com texto preto ou branco escolhido por contraste. Medido nos stills do showcase sobre foto clara: 5,4:1 (16:9) e 9,4:1 (9:16).
- A legenda entra sem fade de opacidade (nenhum quadro sai apagado) e a última palavra da frase não fica sozinha numa página.
- `src/core/color.ts` (luminância, contraste, composição) com testes, incluindo a cor de destaque de todas as marcas.
- `pnpm video plan` mostra quantas palavras são queimadas.

## 0.2.2 (2026-10-31)

- Testes do motor puro em `src/core/*.test.ts` (timeline, srt, schema): duração por cena, ritmo, `duration` forçada, locução, cortes no tempo da música (bpm do job e da marca), encadeamento das cenas, espaçamento dos efeitos, legendas da locução e de vídeo falado (com trim), SRT/VTT e mensagens de erro do schema por campo.
- Todo `jobs/*/job.json` e `brands/*.json` do repositório é validado pelo schema no `pnpm test`.
- `src/core/testing.ts`: fábricas de marca, job e props para os testes.

## 0.2.1 (2026-10-31)

- Folha de contato: no Windows o ffmpeg era chamado pelo cmd.exe e o `|` do layout do xstack virava pipe. `run` e `has` agora chamam executáveis sem shell em qualquer sistema; só atalhos `.cmd`/`.bat` passam pelo shell, com aspas.
- Folha de contato em `scripts/lib/sheet.ts`, usada por `pnpm video stills` e `pnpm media search --sheet`: posição por pixel e job de uma cena só (antes o xstack exigia 2 entradas).
- `pnpm video doctor`: a checagem de numpy/scipy e piper também passava pelo cmd.exe e falhava no Windows.
- `pnpm test` (runner do Node via tsx), com teste da folha rodando o ffmpeg de verdade numa pasta com espaço; roda no CI.

## 0.2.0 (2026-10-31)

- Repositório próprio: github.com/marcuswd/reel (privado). Material e entregas de clientes ficam fora do git.
- Composições antigas feitas à mão (CmsTis, CmsTisV2/V4/V5, AcaiMg, Intro, cenas de exemplo) saem do motor; ficam no ramo `legado`.
- `src/jobs.generated.ts` deixa de ser versionado; `pnpm video index` recria e roda no `pnpm install`.
- `pnpm-workspace.yaml` com `esbuild` liberado (o valor era um marcador sem efeito).
- CI: typecheck e build dos jobs de exemplo a cada push.

## 0.1.0 (2026-10-31)

- Versão inicial importada do `C:\sites\remotion-base`.
