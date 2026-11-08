# Plano da fatia 1 do modo dark

Base: `modo-dark.md` (seções 3 a 7 e decisões da seção 9). Ramo `feat/dark-mode-slice-1`. Sem dependência nova
(`three`, `@react-three/fiber` e `@remotion/three` já existem; fontes só do `@fontsource` já usado pela marca).

## Tarefas e donos

| # | Tarefa | Dono | Arquivos | Porquê de negócio |
| --- | --- | --- | --- | --- |
| T1 | Cena `dark3d` (schema zod, timeline, check, componente, ambientes `corredor`, `poeira`, `vazio`, testes, still de fumaça) | backend/motor | `src/core/schema.ts`, `src/core/timeline.ts`, `src/template/scene-dark.tsx`, `src/template/scenes.tsx`, `scripts/lib/check.ts`, testes | O vídeo dark precisa de fundo 3D sem IA de imagem |
| T2 | Receita `noir-frio` + `curiosidades` em `recipes/dark/*.json` e `video new --recipe` | backend/motor | `recipes/dark/`, `scripts/video.ts`, `scripts/lib/`, testes | Padrões prontos para o usuário não montar o visual |
| T3 | Mood de trilha `drone` no gerador | backend/motor | `scripts/music.py`, `src/core/schema.ts` (enum de mood, só essa linha), testes | Trilha própria, sem licença de terceiros |
| T4 | Skill `reel:dark` | roteiro e produção | `skills/dark/SKILL.md`, `.claude-plugin` se preciso | Tema em uma frase vira job |
| T5 | Job de exemplo fora do repo, voz Kokoro, stills, render, QC, CREDITOS.md | montagem | pasta de vídeos do usuário | Prova do critério de pronto |
| T6 | Direitos: fontes, Kokoro, trilha | direitos | CREDITOS.md do exemplo | Nada sem licença comprovada |
| T7 | Revisão e segurança leve | revisão | diff | Antes de fechar |
| T8 | CHANGELOG, versão, backlog, docs | documentação e git | `CHANGELOG.md`, `package.json`, `.claude-plugin/plugin.json`, `docs/backlog.md` | Fecho |

## Contratos

- `dark3d`: `{ type: "dark3d", env: "corredor"|"poeira"|"vazio", seed?: number, text?, eyebrow?, title?, lightColor?, fogDensity?,
  speed?, depth?, count? ... }`. Tudo em função de `useCurrentFrame()`, PRNG com semente, sem `Math.random`, sem `useFrame`.
  Limites: menos de 20 mil partículas, menos de 4 luzes. Brilho por sprites aditivos. Texto sempre 2D por cima.
- Receita: JSON com padrões do job (fundo, câmera, transição, fonte, trilha, voz Kokoro, legendas pop). A marca
  do cliente só entra no `cta` e `logo` finais.
- Aviso de voz sintética e fontes na descrição: entra no CREDITOS.md e no texto da skill.

## Ordem

T1, T2, T3 em paralelo (arquivos distintos; `schema.ts` tem duas linhas disjuntas, T1 e T3 não rodam testes ao
mesmo tempo que commit). Depois T4, depois T5 e T6, T7, T8.

## Parecer pedido

Segurança/direitos: licença das fontes escolhidas, de Kokoro e do modelo `pm_alex` ou equivalente.
Dados: sem dados pessoais envolvidos.
