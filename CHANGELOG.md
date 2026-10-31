# Changelog

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
