# reel: gerador de vídeos

Ferramenta do Marcus (MARCUSWD) para produzir vídeos de clientes com Remotion 4 + TypeScript + pnpm.
Responda em português. Não use travessão (—) em textos do vídeo nem em textos para o usuário.

**Princípio:** um vídeo novo é um **job em JSON**, não código novo. O motor (`src/core`) e o template
(`src/template`) servem qualquer marca e formato. Só crie componente novo quando um tipo de cena não existir;
nesse caso, crie no template (genérico, configurável por props), nunca em uma pasta por cliente.

## Estrutura

Este repositório é só o motor. **Tudo de um vídeo mora na pasta do cliente** (ex.: `C:\sites\<cliente>\videos`),
e todo comando recebe a pasta do job como primeiro argumento. Nada de cliente é gravado aqui.

```
<cliente>\videos\brand.json      marca (cores, fontes, logo, energia, BPM, contato); fontes e logo na mesma pasta
<cliente>\videos\<job>\         pasta do job:
  job.json                       roteiro (caminhos de mídia relativos a esta pasta: "img/foto.jpg")
  i18n/<lang>.json               traduções ("<idCena>.<campo>": "texto")
  img/ video/ stock/ clips/      material
  voice/ audio/generated/        locução e trilha geradas
  _build/ out/                   gerados: props resolvidas, stills, folhas de contato, render temporário
  entregas/<data>/               mp4, thumb, srt, vtt, CREDITOS.md (ou --dest)

src/core/                  motor: schema (zod), timeline (plano puro), câmera, transições, texto, mídia, legendas, áudio, cor
src/template/              composição "Video" + 11 tipos de cena; demo.ts = props padrão com marca neutra
scripts/                   CLI (video, media, brand, transcribe), trilha (music.py), efeitos (sfx.py)
scripts/lib/workspace.ts   pasta do job: acha a marca, traduz caminhos, põe o material no bundle
public/_lib/sfx/           pack de efeitos próprio (pnpm sfx regera)
src/jobs.generated.ts      gerado, não versionado: vazio, ou o job aberto por `pnpm video studio`
docs/backlog.md            próximos itens (o modo autónomo da equipa lê daqui)
```

`"brand"` no job: um nome (procura `brand.json` na pasta do job, depois na de cima, depois `../brands/<nome>.json`)
ou um caminho para `.json`. Na composição o material aparece como `public/<slug>/` e a marca como `public/_brand/`;
`workspace.ts` faz a tradução, então no job e na marca use sempre caminhos relativos.

## Comandos

```bash
pnpm brand new <pasta> --from https://site.com      # <pasta>/brand.json + logo (rascunho a partir do site)
pnpm brand font <pasta> heading|body "Família" 700,800   # fonte do @fontsource em <pasta>/fonts
pnpm video new <pasta do job> --brand <marca> --format 9:16,16:9
pnpm video check <job>            # valida job, marca, material, traduções e locução, sem renderizar
pnpm video plan <job>             # timeline: durações, transições, câmera, efeitos, legendas
pnpm video voice <job> [--lang all]   # locução TTS por cena (gera tempos por palavra)
pnpm video build <job>            # valida, aplica idiomas/voz e gera a trilha
pnpm video stills <job> [--format all] [--lang all]   # 1 quadro por cena + folha de contato em <job>/out/
pnpm video render <job> [--format all] [--lang all] [--draft] [--dest pasta]   # entrega em <job>/entregas/<data>/
pnpm video studio <job>           # Studio com o job (material servido direto da pasta do cliente)
pnpm video translate <job> --to en [--auto]
pnpm video doctor                 # ferramentas, chaves (só presença) e rede
pnpm test                         # testes (REEL_E2E=1 inclui o ponta a ponta com render)

pnpm media search --type photo|video --q "termo" --orientation portrait --sheet
pnpm media get --source pixabay|unsplash|pexels|openverse --id <id> --out <job>/stock/<nome>.jpg
pnpm transcribe <job>/clips/fala.mp4 --lang pt   # Whisper local -> legendas por palavra
pnpm dev                          # Studio do motor (marca neutra)
```

## Novo vídeo: fluxo

1. **Briefing curto** com `AskUserQuestion` (pule o que o pedido já respondeu; se o usuário disser
   "você decide" ou estiver ausente, decida e diga o que decidiu):
   objetivo, formato/canal (Reels 9:16 20 a 35 s; YouTube 16:9; feed 1:1 ou 4:5), roteiro (pronto, tópicos ou do site),
   locução (sim/não, provedor), legendas (queimada, arquivo, ambos), idiomas, destino.
2. **Material:** procure primeiro no que o usuário já tem (pastas dele, ex.: `C:\sites\<cliente>`; projetos com tokens
   de cor e fontes; pastas `_FILES`, `FOTOS`). Depois site do cliente (WebFetch) e por último bancos (`pnpm media`).
   Para escolher fotos, monte folhas de contato numeradas (ffmpeg) e olhe antes de decidir.
3. **Marca:** `<cliente>\videos\brand.json` (`pnpm brand new`). Fonte condensada pede `"scale": 1.3` e talvez `"uppercase": true`.
   Logo que não contrasta com o fundo: `"plate": "circle"|"rounded"`.
4. **Job:** `pnpm video new <pasta do job> --brand <marca>` e edite o `job.json` (schema em `schemas/job.schema.json`).
   Material na própria pasta do job, citado por caminho relativo. Todo texto fica no job; [colchetes] marcam o destaque.
5. `pnpm video check` → `pnpm video voice` (se houver locução) → `pnpm video stills` → **olhe a folha de contato** e corrija
   (texto cortado, legenda sobre conteúdo, contraste, foto ruim) → `pnpm video render`. `stills` e `render` rodam o
   check antes e param se houver erro (campo inválido, arquivo que não existe, id repetido).
6. Confira o mp4 extraindo quadros nas transições (ffmpeg) e o loudness informado (alvo -14 a -16 LUFS).
7. Entregue: o render grava em `<job>/entregas/<data>/` (ou `--dest`). Informe o caminho e envie o mp4.
   Se houver créditos CC-BY, avise.

## Tipos de cena (campo "type")

cover, statement, media (foto/vídeo tela cheia), split (texto + mídia), screen (print em browser/celular com push-in
e pan), list, stats (números contando), gallery (grid, carousel, stack), quote, cta (botão + contatos), logo.
Campos comuns: `id`, `voice`, `duration`, `transition`, `camera`, `background`, `sfx`.

- **Câmera:** auto, static, in, out, left, right, up, down, push, pull, orbit, tilt, handheld, dolly, whip.
- **Transições:** auto, none, fade, slide, push, wipe, zoom, whip, lift, dive, iris, bands, bubble, leak, glitch, flip.
  "auto" usa `brand.motion.transitions` ou a energia da marca (calm, normal, playful).
- **Fundos:** auto, solid, gradient, mesh, particles, grid, shapes, aurora, ou `{ "type": "media", "media": ..., "dim": 0.5 }`.
- **Mídia:** caminho relativo à pasta do job ou `{ src, focus: {x,y}, fit, trim, muted: false, captions }`. Vídeo de banco ou
  de celular: converta para h264 1080 sem áudio (o `pnpm media get` já faz; arquivos do cliente, faça com ffmpeg).

## Tempo, música e efeitos

- Duração por cena = tempo de leitura (ritmo `pace`) ou locução + respiro, arredondada aos tempos da música
  (`music.bpm` ou `brand.audio.bpm`). Todo corte cai no tempo. `src/core/timeline.ts` é a fonte única.
- `music.mode`: `generate` (trilha original por código, sincronizada, climas upbeat/corporate/tech/calm/epic),
  `file` (arquivo na pasta do job, ex.: baixado com `pnpm audio:get`) ou `none`.
- Efeitos automáticos do pack `public/_lib/sfx` (whoosh nas transições, impact na logo, pop em listas, tick em números,
  chime no CTA, riser antes do fecho). No máximo 1 a cada 0,25 s. Para usar efeitos de banco, crie outro pack com os
  mesmos nomes e aponte `sfx.pack`.
- Áudio de banco: `pnpm audio:search` / `pnpm audio:get` (só CC0, CC-BY, PD; créditos em CREDITS.md).

## Locução, legendas e idiomas

- `voice.provider`: `piper` (local, grátis; vozes pt_BR-faber, pt_PT-tugão, en_US-lessac...; para Angola use
  pt_PT-tugão), `elevenlabs` (melhor, tempos exatos por palavra), `openai`. `voiceId` pode ser `"pt-BR=x,en=y"`.
- Legendas saem da locução (ou de `pnpm transcribe` para vídeo falado). `captions.mode` burn/file/both/none;
  `style` pop/line/box. Com legenda queimada, o layout reserva uma faixa embaixo (conteúdo nunca fica sob ela).
  A legenda da locução não é queimada quando repete o texto da tela (`captions.whenOnScreen: "show"` força);
  toda legenda fica sobre placa escura com contraste AA e a palavra falada vira pílula na cor de destaque.
- Idiomas: `langs` no job + `<job>/i18n/<lang>.json`. `pnpm video translate <job> --to en` cria as chaves;
  preencha você mesmo (no chat) ou use `--auto` (DeepL/Claude/OpenAI se houver chave). Depois rode `voice --lang en`.

## Rede, chaves e onde rodar

- Chaves no `.env` (modelo em `.env.example`). **Nunca leia nem imprima o `.env`**; para checar, use
  `pnpm video doctor` (mostra só presença) ou `grep -o '^[A-Z_]*='`. Nunca ponha chave no `.env.example`.
- Pexels está com emissão de chaves pausada: use Pixabay (fotos e vídeos) e Unsplash (fotos).
- Rodando no Claude (nuvem): o projeto vai para o container sem `node_modules`/`.env`, `pnpm install`, render com o
  Chromium de `/opt/pw-browsers` (detectado sozinho). Chamadas de API que precisam de chave rodam no PC do usuário
  (`node scripts/media.ts ...` no shell do dispositivo, que lê o `.env` local). Sites bloqueados por proxy: não
  contorne; peça ao usuário para liberar o domínio em Settings > Capabilities ou use outra fonte.

## Repositório (github.com/marcuswd/reel, privado)

- Vai para o git só o motor: `src`, `scripts`, `schemas`, `public/_lib` (efeitos), docs e testes. Nenhuma marca, job,
  material, render ou entrega, nem como exemplo; eles moram na pasta do cliente. O `.gitignore` ainda barra `jobs/`,
  `brands/`, `public/*` (menos `_lib`), `clientes/`, `out/` e `.env` por segurança.
- Mudança no motor: `pnpm typecheck`, `pnpm test` e um still da composição padrão (marca neutra de `src/template/demo.ts`):
  `pnpm exec remotion still src/index.ts Video out/smoke.png --frame=60 --scale=0.5`. Olhe a imagem.
- Commits em inglês; registe a mudança no `CHANGELOG.md` e suba a versão do `package.json`.

## Regras de Remotion

- Skills em `.claude/skills/remotion-best-practices`.
- Animação só com `useCurrentFrame()` + `interpolate()`/`spring()`. CSS `transition`/`animation` não renderiza.
- Segundos via `fps`. Pacotes `@remotion/*` na mesma versão (`pnpm exec remotion add <pacote>`).
- `pnpm typecheck` antes de entregar mudanças no motor.
