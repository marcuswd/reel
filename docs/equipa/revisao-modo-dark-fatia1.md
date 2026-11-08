# Revisão: modo dark, fatia 1 (ramo feat/dark-mode-slice-1, diff não commitado)

Data: 2026-11-08. Papel: revisão de código. Régua: `propostas/modo-dark.md`, `propostas/modo-dark-fatia1-plano.md`, `CLAUDE.md`.

Conferido e em dia: sem `Math.random`, `Date`, `useFrame` nem relógio na cena; PRNG com semente; 3 luzes
(ambiente + 2 pontuais); `schemas/job.schema.json` e `brand.schema.json` batem com o zod; nome de receita validado
contra saída de pasta; comandos por lista de argumentos (sem montar string de shell); nenhum nome da equipa nos
arquivos; sem travessão nos textos novos; varredura de vazamentos sem achado.

## Bloqueia

1. `src/template/scene-dark.tsx:123`: no `poeira`, `pos.map(...)` cria um `Float32Array` novo a cada quadro.
   Duas consequências: o `useMemo` de `Dust` (linha 65) gera um `BufferGeometry` novo por quadro, nunca liberado
   (vazamento de GPU durante a cena), e a cena desenha 2 x `count` pontos, até 38 mil com `count` 19000, acima do
   limite de 20 mil do contrato. Correção: memorizar o segundo conjunto (`useMemo` sobre `pos`) e repartir o teto
   entre as duas camadas (por exemplo `clampCount` sobre a soma, ou segunda camada com `count / 2`).

2. `scripts/lib/recipe.ts:78-79` (e o teste `scripts/lib/recipe.test.ts`, "cor do botão"): a cor `primary` do
   cliente sobrescreve a da receita, mas `primary` pinta gráficos, marcadores de lista, pílulas e transições em todo
   o vídeo (`scenes-extra.tsx:66,118`, `scenes.tsx:155`, `ui.tsx:93`, `transitions.tsx:260`). Fere a regra do plano
   "a marca do cliente só entra no `cta` e `logo` finais". Correção: não mesclar `primary` (ou criar um campo de cor
   só do botão do `cta`; isso é desenho, para a liderança técnica).

## Corrigir

3. `scripts/video.ts:385` (via `baseJob`): com `--recipe`, a capa nasce com `logo: true`, ou seja, o logo do
   cliente no início do vídeo. Mesma regra do item 2. Correção: com receita, `logo: false` na capa.
4. `scripts/video.ts:399-401`: a cópia do logo grava em `resolve(dir, v)` com `v` vindo do `brand.json` do cliente;
   caminho com `..` ou absoluto escreve fora da pasta do job (ou sobre o próprio arquivo). Correção: recusar destino
   fora de `dir` (comparar `relative(dir, alvo)`), ou copiar para `dir/<basename>` e reescrever o caminho.
5. `src/template/scene-dark.tsx:15-29,65-69`: `CanvasTexture` e `BufferGeometry` criados à mão nunca recebem
   `dispose()`; o R3F não libera objetos passados por prop. Correção: `useEffect(() => () => x.dispose(), [x])`.
6. `scripts/video.ts:406-408`: `catch {}` engole qualquer falha do `brand font` e diz "sem rede?". Correção: logar
   a mensagem do erro junto da dica.
7. Testes que faltam: nenhum teste do caminho `video new --recipe` (marca gerada, `recipe.json`, cópia do logo,
   recusa de `brand.json` existente) e nenhum still de fumaça registrado para os três `env` (pedido no T1 e no
   `CLAUDE.md`). Correção: teste de CLI em pasta temporária com rede desligada e o still por `env` anexado ao fecho.

## Sugestão

8. `src/core/schema.ts` (linha do `dark3d`): `count` sem máximo e `ribs` com máximo 120 enquanto o código corta em
   19000 e 200 (`dark3d.ts:58`). Alinhar: `count.max(19000)` no zod (aparece no VS Code) e o mesmo teto de `ribs`.
9. `scripts/music.py:228,235`: entradas `drone` em `KEYS` e `PROGS` nunca são lidas (o drone sai antes por
   `sys.exit`). Remover.
10. `scripts/lib/recipe.ts:63`: o parâmetro `explicit` de `applyToJob` só é usado no teste; ou ligar às flags do
    CLI, ou tirar.
11. `scripts/lib/recipe.ts:24-31`: `deepMerge` copia a chave `__proto__` vinda de JSON; filtrar `__proto__`,
    `constructor` e `prototype` custa uma linha.
12. `scripts/brand.ts:156` (já existente, agora chamado pela receita): `npm pack` sem versão fixa; a licença da
    receita cita 5.3.0. Fixar a versão no pacote da receita evita trocar a fonte sem revisão de direitos.
13. `skills/dark/SKILL.md`: o texto fala com o dono pelo nome ("mensagens ao Marcus", "espere o Marcus aprovar");
    numa skill de plugin, "o usuário" serve a qualquer instalação.

## Pendente do fecho (T8, não é achado)

`CHANGELOG.md` e versão em `package.json` e `.claude-plugin/plugin.json` ainda sem a mudança.
