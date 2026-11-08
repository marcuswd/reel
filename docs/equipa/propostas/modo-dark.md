# Proposta: modo dark (tema em uma frase vira vídeo narrado)

Estado: desenho, não implementado. Funcionalidade do reel para uso interno e de clientes; não é produto à venda.
Referência de mecanismo: kits de "canal dark" (tema, roteiro, cenas 3D, narração, revisão, mp4). Copiamos só o
mecanismo; nenhuma marca, texto ou visual de terceiros.

Princípio que se mantém: o modo dark **gera um job.json comum** do reel. Nada de pipeline paralelo; o que for novo
entra como tipos de cena, receitas e um comando que escreve o job. Depois disso valem `check`, `voice`, `stills`,
`render` e `qc` como hoje.

## 1. Fluxo do usuário no Claude Code

Skill nova `reel:dark` (comando `/reel:dark <tema>`), que chama a skill `reel:video` por baixo.

1. Usuário: `/reel:dark por que o oceano é escuro no fundo`.
2. Perguntas mínimas (AskUserQuestion, só o que faltar; cada uma com padrão):
   - formato: curto 9:16 (padrão, 45 s) ou longo 16:9 (3 a 8 min) ou ambos;
   - receita de estilo e de narração (padrão: noir frio + curiosidades);
   - idioma (padrão pela política do projeto, depois pt-BR);
   - pasta do job (padrão `<videos>\dark-<slug>`).
3. A skill escreve o roteiro em `roteiro.md` no job (texto falado, frase na tela, cena 3D sugerida, fontes dos fatos)
   e **para para a revisão 1**: o usuário aprova ou pede ajuste em linguagem natural. No longo, primeiro só o
   esqueleto de capítulos, depois o texto completo.
4. `pnpm video dark-plan <job>` converte o roteiro aprovado em `job.json` (cenas, receita, voz, legendas).
5. `video voice` e `video stills`: **revisão 2** na folha de contato (`out/sheet-*.jpg`), com comandos de ajuste
   por cena em linguagem natural ("cena 3 mais lenta", "troca a 5 por planeta", "encurta o gancho"), que a skill
   traduz em edição do job.
6. `video render --format all` e QC; entrega em `entregas/<data>/` com mp4, thumb, srt, vtt, CREDITOS.md e
   `PUBLICAR.md` (checklist de publicação: título, descrição, fontes, créditos, hashtags, aviso de voz sintética
   quando a plataforma pedir).

## 2. Roteiro e como vira job

Estrutura padrão:

| Parte | Curto 9:16 (30 a 60 s) | Longo 16:9 (3 a 8 min) |
| --- | --- | --- |
| Gancho | 0 a 3 s, afirmação ou pergunta que abre lacuna | 0 a 3 s |
| Contexto | 3 a 10 s | promessa e contexto, 10 a 25 s |
| Desenvolvimento | 3 a 5 blocos de 6 a 9 s | 4 a 8 capítulos de 30 a 60 s, cada um com mini gancho |
| Virada | últimos 10 s | penúltimo capítulo |
| Fecho | 3 a 5 s, última frase puxa o gancho (loop), CTA leve | 15 a 25 s, resumo em uma frase, pergunta, CTA |

Ritmo: TTS em pt-BR a cerca de 2,6 palavras por segundo (curto de 45 s tem uns 120 palavras; longo de 5 min, uns
780). Cenas: curto 8 a 12 por minuto, longo 5 a 8 por minuto. A duração final segue a fala, como o motor já faz.

Mapa bloco para cena (tipos atuais mais os novos da seção 3):
gancho em `kinetic` ou `dark3d` vazio com texto; contexto em `dark3d` (planeta, corredor) ou `object3d`;
desenvolvimento alternando `statement`, `stats`, `list`, `chart`, `map`, `quote` e `dark3d`; virada com câmera
`whip`/`push` e transição `glitch` ou `zoomblur`; fecho em `statement` de loop e `cta` curto.
O texto na tela é sempre mais curto que a fala; nunca três cenas de texto seguidas (o `check` já avisa).

Cuidados de conteúdo (entram nas instruções da skill): todo número, data ou nome com fonte verificável, guardada no
`roteiro.md` e no CREDITOS.md, não na tela; teoria e lenda marcadas como tal ("segundo", "diz a lenda"); sem
promessa de ganho, cura ou resultado; sem crimes recentes com vítimas identificáveis; saúde e finanças com aviso;
números e datas por extenso para o TTS; gancho que o vídeo cumpre.

## 3. Cenas 3D

Viável no Remotion sem IA de imagem: o motor já tem `@remotion/three`, `three` e `@react-three/fiber` e a cena
`object3d`. Regras para continuar determinístico: tudo em função de `useCurrentFrame()` (nunca `useFrame` nem
relógio), posições por PRNG com semente (nunca `Math.random`), sem física e sem buffers acumulados entre quadros
(cada quadro renderiza sozinho, senão a render paralela quebra). Permitido: instancing para milhares de partículas
ou blocos, névoa exponencial, luz com cintilação por seno, emissivo com brilho falso por sprites aditivos, shaders
simples com uniform de tempo.

Primeiro conjunto, um tipo de cena novo `dark3d` com `env` e parâmetros:

| env | Parâmetros | Serve para |
| --- | --- | --- |
| `corredor` | depth, width, ribs, lightColor, speed | avanço, descoberta, tensão |
| `planeta` | radius, atmosphereColor, rim, rotation, moons | escala, mundo, isolamento |
| `poeira` | count, size, drift, depthSpread, seed | frases abstratas, memória, transição |
| `monolitos` | count, heightRange, spacing, seed, emissiveEdge | poder, mistério, lista de elementos |
| `linha-do-tempo` | marks[{label}], spacing, focusIndex | cronologia e passos |
| `vazio` | text, fogDensity, lightAngle | frase chave e título de capítulo |

Texto sobre o 3D: no primeiro conjunto em 2D por cima (camada de texto do motor); texto 3D extrudado fica para depois.
Regra da casa: nenhuma pessoa gerada por IA nem modelada; nada de personagens. Pessoas reais só de banco gratuito
com crédito, e o modo dark em princípio não usa pessoas.

Custo de render (1080x1920, 30 fps): cena simples 1 a 3 s por quadro com GPU (`angle`), pesada 5 a 10 s; sem GPU
(`swangle`) 5 a 20 vezes mais lento. Limites por cena: menos de 20 mil partículas, menos de 4 luzes. Riscos: perda de
contexto WebGL com vários canvas (um por cena, concorrência baixa), diferença entre máquinas (fixar `REEL_GL`,
testar um still), banding em gradiente escuro (o grão resolve), remontagem do canvas nos cortes (pré-montar com
margem na `Sequence`).

## 4. Narração

- Padrão gratuito e local: Kokoro (pt-BR `pm_alex`, `pm_santa`, `pf_dora`; Apache 2.0) e Piper (`pt_BR-faber`,
  `en_US-lessac`). Hoje o job precisa declarar `voice.provider`; o modo dark declara Kokoro por padrão.
- Ritmo: Kokoro por velocidade, Piper por `length` e pausa fixa de 0,25 s entre frases. Pausas dramáticas vêm da
  pontuação e de um campo novo `pause` por cena (pedido à Fábrica).
- Voz paga só como opção explícita na receita, com custo mostrado antes de gerar: ElevenLabs na faixa de US$ 0,15
  a 0,30 por minuto de narração conforme o plano; OpenAI `tts-1` cerca de US$ 15 por 1 milhão de caracteres (o padrão
  do código, `gpt-4o-mini-tts`, cobra por token e minuto). Valores aproximados: conferir a tabela atual antes.
  Hoje as pagas não recebem velocidade pelo código.
- Voz paga manda o texto a terceiros: em projeto de cliente, a TI decide antes.
- Escolha da voz grave é de ouvido: gerar uma amostra de 10 s por voz candidata antes de fixar a receita.

## 5. Receitas (arquivo `recipes/dark/*.json` no motor)

Uma receita é um conjunto de padrões do job (fundo, cor, LUT, câmera, transições, fonte, trilha, voz, legendas).
O usuário pode trocar qualquer campo depois.

Estilo:

- **noir-frio**: preto azulado #07090d, luz ciano apagada, névoa densa, dolly lento, corte seco e fade pelo preto,
  sans condensada em caixa alta, trilha drone grave.
- **brasa**: #0b0605, âmbar e vermelho queimado, luz rasante baixa, poeira quente, push-in com balanço leve,
  crossfade lento, serifa seca, ambient com pulso.
- **neon-vazio**: #05030a, magenta e violeta em contraluz, grid no chão, órbita lenta, glitch curto nas transições,
  mono ou grotesca, synth lenta.

Em todas: vinheta, grão fino, LUT de baixo contraste, legenda com placa para contraste AA.

Narração:

- **curiosidades** (padrão): tom seco e confiante, frases de 6 a 10 palavras, um fato por cena, muito `stats` e `list`.
- **misterio**: tom grave e baixo, pausas, frases curtas alternando com uma longa, ordem cronológica, revelação só no
  último terço, `map` e `dark3d` corredor ou monolitos.
- **explicacao**: tom calmo, problema, causa, consequência e o que muda; uma analogia por conceito, `chart` e `split`.

## 6. Licenças a conferir (revisão de direitos antes de cada entrega)

- **Trilha**: a gerada por código do motor não tem licença de terceiros; precisa de moods novos (drone, ambient,
  synth lenta). Música de banco só com licença de uso comercial e registro no CREDITOS.md.
- **Efeitos**: pack próprio, sem pendência.
- **Fontes**: @fontsource com licença OFL ou Apache; conferir cada família da receita.
- **Modelos 3D**: preferir procedural. Se usar glTF, só CC0 explícito (Poly Haven, Kenney), só rochas, props e
  ruínas, sem texturas de terceiros embutidas, com fonte e URL no job.
- **Vozes**: Kokoro Apache 2.0; Piper varia por modelo (conferir o cartão de `pt_BR-faber` e de cada voz, inclusive
  uso comercial); ElevenLabs e OpenAI pelos termos do plano contratado.
- **Imagens por IA** (FLUX, só fundos e objetos, nunca pessoas) e bancos: como hoje, com crédito.
- **Plataformas**: aviso de conteúdo sintético quando YouTube ou Instagram exigirem.
- **Remotion**: licença da empresa conforme o tamanho da equipa (já vale para o motor todo).

## 7. Primeira fatia e o que fica para depois

**Fatia 1 (entregável): curto 9:16, uma receita, três ambientes.**

- Tipo de cena `dark3d` com `corredor`, `poeira` e `vazio` (texto 2D por cima), determinístico e com semente.
  (Fábrica: código do motor, schema zod, testes, still de fumaça.)
- Receita `noir-frio` + `curiosidades` como padrões aplicados ao job, com voz Kokoro e legendas pop.
  (Fábrica: carregar receita no `video new --recipe`; Produtora: valores da receita.)
- Mood de trilha `drone` no gerador. (Fábrica.)
- Skill `reel:dark` que faz as perguntas, escreve `roteiro.md`, para na revisão e monta o `job.json` à mão pela skill
  (sem o comando `dark-plan` ainda). (Produtora escreve a skill; Fábrica revisa.)
- Critério de aceite: de um tema a um mp4 9:16 de 40 a 50 s, QC sem falha, render em menos de 15 min numa máquina
  com GPU, CREDITOS.md completo.

**Depois:**

- Ambientes `planeta`, `monolitos`, `linha-do-tempo`; receitas `brasa`, `neon-vazio`, `misterio`, `explicacao`.
- Formato longo 16:9 com esqueleto de capítulos.
- Comando `video dark-plan` (roteiro para job sem passar pela skill) e comandos de ajuste de cena.
- `PUBLICAR.md` gerado com checklist por plataforma.
- Campo `pause` por cena e velocidade para vozes pagas.
- Texto 3D extrudado com a fonte da marca; brilho real (EffectComposer) se o falso não bastar.
- Amostra de voz para escolha e estimativa de custo antes da voz paga.

Pedido à Fábrica (não aberto ainda): tipo de cena `dark3d`, receitas, mood de trilha, `pause` por cena,
`dark-plan`. Registrar no `docs/backlog.md` quando o desenho for aprovado.

## 8. Perguntas abertas

1. Narração padrão: curiosidades fixa (padrão) ou perguntar a receita a cada tema?
2. Longo 16:9 entra na fatia 1 ou depois? Padrão: depois.
3. Voz paga: permitida em projetos de cliente (com aprovação da TI e custo repassado) ou só uso interno? Padrão: só
   gratuita até decidir.
4. Brilho: falso por sprites (padrão, barato) ou pós-processamento real (mais bonito, lento, risco de GL)?
5. Texto sobre o 3D: 2D por cima (padrão) ou fonte da marca extrudada?
6. Marca: o modo dark usa a marca do cliente (cores viram luz) ou a receita manda e a marca entra só no logo e no
   CTA? Padrão: receita manda, marca no fecho.
7. Aviso de voz sintética e fontes na descrição do vídeo: sempre (padrão) ou só quando a plataforma exigir?

## 9. Decisões (aprovadas em 08/11/2026)

Os sete padrões da seção 8 foram aprovados como estão.

| # | Pergunta | Decisão |
| --- | --- | --- |
| 1 | Narração padrão | Receita `curiosidades` fixa, sem perguntar a cada tema. |
| 2 | Longo 16:9 | Fica para depois da fatia 1. |
| 3 | Voz paga | Só em uso interno; cliente usa voz gratuita até nova decisão. |
| 4 | Brilho | Falso por sprites aditivos, sem pós-processamento. |
| 5 | Texto sobre o 3D | 2D por cima (camada de texto do motor). |
| 6 | Marca | A receita define o visual; a marca do cliente entra só no fecho (logo e CTA). |
| 7 | Aviso de voz sintética e fontes | Sempre na descrição do vídeo. |

Escopo da fatia 1: curto 9:16 de 40 a 50 s, cena `dark3d` com `corredor`, `poeira` e `vazio`, receita `noir-frio` com
narração `curiosidades` em Kokoro, mood de trilha `drone`, skill `reel:dark` sem `dark-plan`.
