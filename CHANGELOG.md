# Changelog

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
