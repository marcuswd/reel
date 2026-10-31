# Changelog

## 0.2.0 (2026-10-31)

- Repositório próprio: github.com/marcuswd/reel (privado). Material e entregas de clientes ficam fora do git.
- Composições antigas feitas à mão (CmsTis, CmsTisV2/V4/V5, AcaiMg, Intro, cenas de exemplo) saem do motor; ficam no ramo `legado`.
- `src/jobs.generated.ts` deixa de ser versionado; `pnpm video index` recria e roda no `pnpm install`.
- `pnpm-workspace.yaml` com `esbuild` liberado (o valor era um marcador sem efeito).
- CI: typecheck e build dos jobs de exemplo a cada push.

## 0.1.0 (2026-10-31)

- Versão inicial importada do `C:\sites\remotion-base`.
