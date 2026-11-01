---
name: video
description: Produz vídeos de motion (Remotion) para clientes do Marcus a partir de um job em JSON na pasta do projeto do cliente - briefing, marca, material, roteiro, locução, legendas, idiomas, stills de conferência, render e entrega. Use quando pedirem um vídeo, reels, teaser, vídeo de produto, demo animada ou peça em movimento.
---
# Vídeo com o reel

Um vídeo é um **job em JSON**, não código novo. O motor (Remotion 4) monta cenas, câmera, transições, trilha
sincronizada, efeitos, locução, legendas e idiomas, e renderiza em 16:9, 9:16, 1:1 ou 4:5.
Sem travessão (—) nos textos do vídeo nem nas mensagens ao Marcus.

## 0. Preparar o motor (sempre, antes do primeiro comando da sessão)

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/plugin/setup.mjs" --data "${CLAUDE_PLUGIN_DATA}"
```

A última linha diz `REEL=<pasta do motor>`. Nos comandos abaixo, `<motor>` é essa pasta. Na primeira vez (ou depois
de uma atualização com dependência nova) o comando instala as dependências e leva 1 a 2 minutos; depois é instantâneo.
Se falhar, mostre o erro ao Marcus. Se algo do vídeo falhar depois (trilha, locução, render), rode
`pnpm --dir "<motor>" video doctor`: ele diz o que falta (ffmpeg, `pip install numpy scipy piper-tts`, chaves).

## Onde fica cada coisa

Tudo do vídeo mora no **projeto do cliente** (a pasta da sessão, ou a que o Marcus indicar). O motor não guarda nada de cliente.

```
<projeto>/videos/brand.json      marca: cores, fontes, logo, energia, BPM, contato (fontes e logo ao lado)
<projeto>/videos/<job>/          um vídeo:
  job.json                       roteiro; mídia por caminho relativo a esta pasta ("img/foto.jpg")
  i18n/<lang>.json               traduções
  img/ video/ stock/ clips/      material
  voice/ audio/generated/        locução e trilha geradas
  _build/ out/                   gerados: props, stills e folhas de contato
  entregas/<data>/               mp4, thumb, .srt, .vtt, CREDITOS.md
```

Comandos: rode da pasta do projeto, `pnpm --dir "<motor>" <comando>`; caminhos relativos valem a partir dela.

```bash
pnpm --dir "<motor>" brand new ./videos --from https://site-do-cliente.com   # rascunho da marca (cores, fontes, logo)
pnpm --dir "<motor>" brand font ./videos heading "Montserrat" 700,800        # fonte do @fontsource
pnpm --dir "<motor>" video new ./videos/promo --brand <marca> --format 9:16,16:9
pnpm --dir "<motor>" video check ./videos/promo     # valida job, marca e material, sem renderizar
pnpm --dir "<motor>" video plan ./videos/promo      # durações, transições, efeitos, legendas
pnpm --dir "<motor>" video voice ./videos/promo [--lang all]
pnpm --dir "<motor>" video translate ./videos/promo --to en [--auto]
pnpm --dir "<motor>" video stills ./videos/promo [--format all] [--lang all]
pnpm --dir "<motor>" video render ./videos/promo [--format all] [--lang all] [--draft] [--dest <pasta>]
pnpm --dir "<motor>" video studio ./videos/promo    # Studio do Remotion com o job
pnpm --dir "<motor>" media search --type photo|video --q "termo" [--orientation portrait] --sheet
pnpm --dir "<motor>" media get --source pixabay|unsplash|openverse --id <id> --out ./videos/promo/stock/<nome>.jpg
pnpm --dir "<motor>" media gen --prompt "fundo abstrato de ondas" --out ./videos/promo/img/fundo.jpg --variants 4
pnpm --dir "<motor>" video qc ./videos/promo         # revisa a última entrega (o render já roda no fim)
pnpm --dir "<motor>" transcribe ./videos/promo/clips/fala.mp4 --lang pt
```

## Fluxo

1. **Briefing** com AskUserQuestion, só o que o pedido não respondeu (se o Marcus disser "você decide" ou estiver
   ausente, decida e diga o que decidiu): objetivo; formato/canal (Reels 9:16 20 a 35 s, YouTube 16:9, feed 1:1 ou
   4:5); roteiro (pronto, tópicos ou a partir do site); locução (sim/não, provedor); legendas (queimada, arquivo,
   ambos); idiomas; pasta do projeto.
2. **Material**: primeiro o que o cliente já tem (pastas do projeto, `_FILES`, `FOTOS`, tokens de cor e fontes do
   código), depois o site do cliente, depois bancos (`media search|get`) e imagens por IA (`media gen`, só fundos,
   objetos e ilustrações). Tudo vai para a pasta do job. Para
   escolher, monte folha de contato numerada (`media search --sheet` ou ffmpeg) e olhe antes de decidir. Pessoas e
   cenas reais só de banco gratuito, com licença conferida; nunca gerar pessoas por IA.
3. **Marca**: `videos/brand.json` (`brand new` + `brand font`). Fonte condensada pede `"scale": 1.3` e talvez
   `"uppercase": true`; logo que não contrasta com o fundo: `"plate": "circle"|"rounded"`.
4. **Job**: `video new` e edite o `job.json` (schema no `$schema` que o `new` escreve). Todo texto fica no job;
   [colchetes] marcam o destaque. Evite cara de slideshow: alterne texto com gráfico (`chart`), tipografia cinética
   (`kinetic`), 3D (`object3d`), mapa (`map`), Lottie, mídia e telas; o `check` avisa quando há texto demais em sequência. Tipos de cena, câmera, transições, fundos, áudio e legendas: leia
   [referencia.md](referencia.md).
5. `video check` → `video voice` (se houver locução) → `video stills` → **olhe a folha de contato**
   (`<job>/out/sheet-*.jpg`) e corrija texto cortado, legenda sobre conteúdo, contraste, foto ruim → `video render`.
   `stills` e `render` rodam o check antes e param se houver erro (o erro diz o campo e o arquivo).
6. **QC**: o render termina com a revisão automática (resolução, duração, tela preta, imagem parada, silêncio,
   loudness -14 a -16 LUFS, quatro quadros em `<job>/out/qc/`). Olhe a folha do QC; problema (✗) bloqueia a entrega.
7. **Entrega**: o mp4 sai em `<job>/entregas/<data>/` (ou `--dest`). Informe o caminho, envie o mp4 e avise se
   houver créditos CC-BY (`CREDITOS.md`).

## Regras

- Nunca grave nada na pasta do motor nem edite o código dele dentro desta skill. Se faltar um tipo de cena ou o motor
  errar, diga ao Marcus o que aconteceu (comando, erro, job) e siga com o que existe; melhoria do motor é feita no
  repositório github.com/marcuswd/reel.
- Remotion: o plugin traz as skills oficiais (`reel:remotion-best-practices`, `reel:remotion-captions`,
  `reel:remotion-render`, `reel:remotion-docs`). Use-as em vez de deduzir a API do Remotion.
- Chaves de API: pedidas pelo Claude Code ao habilitar o plugin (configuração do plugin `reel`) e gravadas só no
  `.env` do motor. Nunca leia nem imprima esse `.env`; para conferir, `video doctor` mostra só a presença.
