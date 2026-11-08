---
name: dark
description: Transforma um tema em uma frase em um curto vertical 9:16 de 40 a 50 s, narrado, com fundo 3D escuro (modo dark, receita noir-frio e curiosidades, voz local Kokoro). Escreve o roteiro, para para aprovação, monta o job, renderiza e entrega com PUBLICAR.md e CREDITOS.md. Use com /reel:dark <tema> quando pedirem vídeo dark, canal dark, curiosidade narrada ou vídeo de fato curioso.
---
# Modo dark (curto 9:16)

Comando: `/reel:dark <tema>`. Gera um `job.json` comum do reel; por baixo vale tudo da skill `reel:video`
(passo 0 do motor, comandos, pastas, regras). **Não repita os comandos aqui**: leia `reel:video` e
[referencia.md](../video/referencia.md) e use-os com `pnpm --dir "<motor>"` e a pasta do job como primeiro argumento.
Sem travessão (—) nos textos do vídeo nem nas mensagens ao usuário.

## Escopo da fatia 1

- SÓ curto 9:16, 40 a 50 s. Se pedirem longo 16:9, ambos os formatos ou outra receita (brasa, neon, mistério,
  explicação), diga que fica para depois e siga com o curto.
- Receita fixa `dark/noir-frio+curiosidades`, sem perguntar. Voz Kokoro (`pm_alex`), gratuita e local. Voz paga fica
  fora (em cliente, só gratuita).
- A receita define o visual. A marca do cliente (opcional) entra só no fecho: `cta` e logo.
- Nunca pessoas geradas por IA nem modeladas, nem personagens. O modo dark em princípio não usa pessoas.

## Fluxo

1. **Perguntas mínimas** (AskUserQuestion, só o que faltar, cada uma com padrão): idioma (política do projeto,
   depois pt-BR); pasta do job (padrão `<videos>\dark-<slug>`); marca do cliente para o fecho (opcional, padrão
   nenhuma). Se o usuário disser "você decide", decida e diga o que decidiu.
2. **Roteiro** em `<job>/roteiro.md` (crie a pasta; o `video new` vem depois). Conteúdo:
   - Título provisório e o gancho em uma linha.
   - **Texto falado**: de 110 a 125 palavras (pt-BR, a cerca de 2,6 palavras por segundo, o que dá 42 a 48 s).
     Em outros idiomas, ajuste a contagem à velocidade da voz e mire os mesmos 40 a 50 s.
   - Tabela por bloco: texto falado, **frase na tela**, cena `dark3d` sugerida (env), fonte do fato.
   - **Fontes dos fatos**: lista com URL e data de acesso. Todo número, data e nome tem fonte verificável.
3. **PARE na revisão 1.** Mostre o roteiro (resumido) e espere o usuário aprovar ou pedir ajuste em linguagem
   natural. Só siga com aprovação.
4. **Job**: `video new <pasta> --recipe dark/noir-frio+curiosidades` (com `--brand <marca>` se houver cliente e
   `--format 9:16`). Depois monte o `job.json` **à mão** (não existe `dark-plan`), conforme a estrutura abaixo.
5. `video check` e corrija. Depois `video voice` (Kokoro) e `video stills`.
6. **Revisão 2**: olhe a folha de contato (`<job>/out/sheet-*.jpg`), corrija texto cortado, legenda sobre
   conteúdo, contraste, fundo claro demais, e mostre ao usuário. Ajustes vêm em linguagem natural ("cena 3 mais lenta",
   "troca a 5 por poeira", "encurta o gancho") e você traduz em edição do job; rode `stills` de novo.
7. `video render` (9:16) e `video qc`. Problema (✗) bloqueia a entrega. Meta: QC sem falha, render em menos de
   15 min com GPU.
8. **Entrega** em `<job>/entregas/<data>/`: mp4, thumb, srt, vtt, `CREDITOS.md` e `PUBLICAR.md`.

## Estrutura do job (8 a 10 cenas)

| Parte | Cena | Observação |
| --- | --- | --- |
| Gancho (0 a 3 s) | `dark3d` env `vazio` com `text` | afirmação ou pergunta que abre lacuna, que o vídeo cumpre |
| Contexto (3 a 10 s) | `dark3d` env `corredor` | avanço e descoberta |
| Desenvolvimento (3 a 5 blocos de 6 a 9 s) | alterna `statement`, `stats`, `list` e `dark3d` env `poeira` | um fato por cena |
| Virada (últimos 10 s) | `statement` ou `stats`, câmera `push`/`whip` e transição `glitch` ou `zoomblur` | o fato mais forte |
| Fecho (3 a 5 s) | `statement` de loop, depois `cta` curto | a última frase puxa o gancho; a marca só no `cta` |

Regras de montagem:

- Nunca 3 cenas de texto seguidas (`statement`, `list`, `stats`): intercale `dark3d`. O `check` avisa.
- O texto na tela é sempre mais curto que a fala; a locução diz o que a tela não diz, não a lê.
- Frases de 6 a 10 palavras, um fato por cena, tom seco e confiante. Prefira `stats` e `list`.
- Na fala (`voice`), números e datas **por extenso** para o TTS ("mil novecentos e sessenta", "onze mil metros").
  Na tela, pode ser algarismo, curto. [colchetes] marcam o destaque.
- Limites do 3D: `count` abaixo de 20 mil, `depth` 5 a 300, `fogDensity` 0 a 1, `speed` 0 a 10. Sempre `seed` fixo.
  Alterne `env` para não repetir o mesmo fundo em cenas vizinhas.
- Nada de CSS animado nem código novo: só campos do schema.

### Exemplo mínimo (trecho do `job.json`)

```json
{
  "scenes": [
    { "id": "gancho", "type": "dark3d", "env": "vazio", "seed": 11, "fogDensity": 0.7,
      "text": "Abaixo de [mil metros], o oceano não tem luz",
      "voice": "Abaixo de mil metros, o oceano não recebe nenhuma luz do sol." },
    { "id": "contexto", "type": "dark3d", "env": "corredor", "seed": 12, "depth": 80, "ribs": 24, "speed": 2,
      "eyebrow": "Zona batial", "title": "Descer é entrar no escuro",
      "voice": "A luz azul some aos duzentos metros. Depois disso, só resta breu." },
    { "id": "fato1", "type": "stats", "eyebrow": "Fato",
      "items": [{ "value": 1000, "suffix": " m", "label": "fim da luz do sol" }],
      "voice": "Passando de mil metros, a luz do sol já não chega." },
    { "id": "fundo", "type": "dark3d", "env": "poeira", "seed": 13, "count": 6000, "drift": 0.4,
      "text": "[Neve marinha] cai o tempo todo",
      "voice": "O que ilumina o fundo são restos de seres vivos, a neve marinha." },
    { "id": "lista", "type": "list", "title": "Quem brilha lá embaixo", "icon": "dot",
      "items": ["Peixes-lanterna", "Águas-vivas", "Camarões"],
      "voice": "Muitos animais fabricam a própria luz. É a bioluminescência." },
    { "id": "loop", "type": "statement", "text": "E se o [escuro] for só o começo?",
      "voice": "E o escuro, lá embaixo, é só o começo." },
    { "id": "fecho", "type": "cta", "title": "Siga para mais", "logo": true }
  ]
}
```

(O exemplo mostra campos válidos de `dark3d`: `env` corredor|poeira|vazio, `seed`, `eyebrow`, `title`, `text`,
`lightColor`, `fogDensity`, `speed`, `depth`, `ribs`, `count`, `size`, `drift`. Um job real tem 8 a 10 cenas.)

## Regras de conteúdo

- Todo número, data ou nome com **fonte verificável** (enciclopédia, instituto, artigo, órgão oficial), guardada em
  `roteiro.md` e no `CREDITOS.md`, não na tela. Sem fonte, não entra.
- Teoria, hipótese e lenda marcadas como tal ("segundo", "diz a lenda", "uma hipótese"). Nunca como fato.
- Sem promessa de ganho, cura ou resultado.
- Sem crimes recentes com vítimas identificáveis. Sem nomes de pessoas vivas em acusação.
- Saúde e finanças: aviso de que não substitui profissional, na fala curta ou na descrição.
- O gancho tem de ser cumprido pelo vídeo. Sem isca falsa.
- Nunca gerar pessoas por IA. Imagens de apoio só procedurais ou de banco com licença conferida.

## Entrega: PUBLICAR.md e CREDITOS.md

O aviso de voz sintética e as fontes dos fatos entram **SEMPRE** na descrição publicada (decisão aprovada).
Na entrega, escreva `PUBLICAR.md` simples ao lado do mp4:

```
# Publicar

## Título
<título curto, sem isca falsa>

## Descrição
<2 a 3 linhas do que o vídeo conta>

Narração em voz sintética (Kokoro, gerada por computador).
Fontes: <fonte 1 com URL> · <fonte 2 com URL> ...
Trilha e imagens produzidas por código, sem material de terceiros.

## Créditos
Ver CREDITOS.md.

## Hashtags
<5 a 8 hashtags do tema, em minúsculas>

## Antes de postar
- Marcar "conteúdo sintético/alterado" onde a plataforma pedir.
- Conferir os fatos contra as fontes listadas.
```

`CREDITOS.md` completo (o `render` cria a base; complete o que faltar):

- **Fonte tipográfica**: Barlow Condensed, OFL-1.1, https://fontsource.org/fonts/barlow-condensed.
- **Voz**: Kokoro-82M (kokoro-onnx), Apache-2.0, voz `pm_alex`; locução sintética. Conferir o VOICES.md da voz
  antes de cada entrega comercial.
- **Trilha**: própria, gerada por código do motor (mood `drone`), sem licença de terceiros.
- **Efeitos**: pack próprio do motor.
- **Fontes dos fatos**: a mesma lista do `roteiro.md`, com URL e data de acesso.
- Qualquer imagem de banco ou IA (se houver), com autor, licença e URL.

## Regras

- Não edite o motor nem grave na pasta dele. Se faltar algo (ambiente 3D, campo), diga o que aconteceu e siga com
  o que existe; melhoria vai ao repositório do motor.
- Não pare no meio sem dizer onde parou: o roteiro aprovado é o ponto de retomada.
- Chaves e `.env`: nunca ler nem imprimir (ver `reel:video`).
