# reel: gerador de vídeos

Ferramenta do Marcus (MARCUSWD) para produzir vídeos de clientes com Remotion 4 + TypeScript + pnpm.
Responda em português. Não use travessão (—) em textos do vídeo nem em textos para o usuário.

**Princípio:** um vídeo novo é um **job em JSON**, não código novo. O motor (`src/core`) e o template
(`src/template`) servem qualquer marca e formato. Só crie componente novo quando um tipo de cena não existir;
nesse caso, crie no template (genérico, configurável por props), nunca em uma pasta por cliente.

## Estrutura

```
brands/<marca>.json        identidade: cores, fontes, logo, energia de movimento, BPM, contato
jobs/<slug>/job.json       roteiro: cenas, formatos, idiomas, trilha, locução, legendas, overlays
jobs/<slug>/i18n/<lang>.json  traduções ("<idCena>.<campo>": "texto")
jobs/<slug>/_build/        gerado pelo build (não editar)
public/<slug>/             assets do job (img/, video/, stock/, voice/, audio/generated/)
public/_lib/sfx/           pack de efeitos próprio (pnpm sfx regera)
src/core/                  motor: schema (zod), timeline (plano puro), câmera, transições, texto, mídia, legendas, áudio
src/template/              composição "Video" + 11 tipos de cena
src/jobs.generated.ts      gerado e não versionado: jobs no Studio (pasta "Jobs"); pnpm video index recria
scripts/                   CLI (video, media, brand, transcribe), trilha (music.py), efeitos (sfx.py)
clientes/<client>/<slug>/<data>/  entrega (mp4, thumb, srt, vtt, CREDITOS.md)
docs/backlog.md            próximos itens (o modo autónomo da equipa lê daqui)
```

## Comandos

```bash
pnpm video new <slug> --brand <marca> --client <pasta> --format 9:16,16:9
pnpm video plan <slug>            # timeline: durações, transições, câmera, efeitos, legendas
pnpm video voice <slug> [--lang all]   # locução TTS por cena (gera tempos por palavra)
pnpm video build [slug]           # valida, aplica idiomas/voz, gera a trilha, atualiza o Studio e os JSON Schemas
pnpm video stills <slug> [--format all] [--lang all]   # 1 quadro por cena + folha de contato em out/<slug>/
pnpm video render <slug> [--format all] [--lang all] [--draft] [--dest pasta]
pnpm video translate <slug> --to en [--auto]
pnpm video doctor                 # ferramentas, chaves (só presença) e rede
pnpm test                         # testes do motor (src/core) e dos scripts, runner do Node

pnpm media search --type photo|video --q "termo" --orientation portrait --sheet
pnpm media get --source pixabay|unsplash|pexels|openverse --id <id> --out public/<slug>/stock/<nome>.jpg
pnpm brand new <marca> --from https://site.com   # rascunho de marca a partir do site
pnpm brand font <marca> heading|body "Família" 700,800   # fonte do @fontsource (npm)
pnpm transcribe public/<slug>/video/fala.mp4 --lang pt   # Whisper local -> legendas por palavra
pnpm dev                          # Studio
```

## Novo vídeo: fluxo

1. **Briefing curto** com `AskUserQuestion` (pule o que o pedido já respondeu; se o usuário disser
   "você decide" ou estiver ausente, decida e diga o que decidiu):
   objetivo, formato/canal (Reels 9:16 20 a 35 s; YouTube 16:9; feed 1:1 ou 4:5), roteiro (pronto, tópicos ou do site),
   locução (sim/não, provedor), legendas (queimada, arquivo, ambos), idiomas, destino.
2. **Material:** procure primeiro no que o usuário já tem (pastas dele, ex.: `C:\sites\<cliente>`; projetos com tokens
   de cor e fontes; pastas `_FILES`, `FOTOS`). Depois site do cliente (WebFetch) e por último bancos (`pnpm media`).
   Para escolher fotos, monte folhas de contato numeradas (ffmpeg) e olhe antes de decidir.
3. **Marca:** `brands/<marca>.json`. Fonte condensada pede `"scale": 1.3` e talvez `"uppercase": true`.
   Logo que não contrasta com o fundo: `"plate": "circle"|"rounded"`.
4. **Job:** escreva `jobs/<slug>/job.json` (schema em `schemas/job.schema.json`). Todo texto fica no job;
   [colchetes] marcam o destaque.
5. `pnpm video voice` (se houver locução) → `pnpm video stills` → **olhe a folha de contato** e corrija
   (texto cortado, legenda sobre conteúdo, contraste, foto ruim) → `pnpm video render`.
6. Confira o mp4 extraindo quadros nas transições (ffmpeg) e o loudness informado (alvo -14 a -16 LUFS).
7. Entregue: informe o caminho em `clientes/...` e envie o mp4. Se houver créditos CC-BY, avise.

## Tipos de cena (campo "type")

cover, statement, media (foto/vídeo tela cheia), split (texto + mídia), screen (print em browser/celular com push-in
e pan), list, stats (números contando), gallery (grid, carousel, stack), quote, cta (botão + contatos), logo.
Campos comuns: `id`, `voice`, `duration`, `transition`, `camera`, `background`, `sfx`.

- **Câmera:** auto, static, in, out, left, right, up, down, push, pull, orbit, tilt, handheld, dolly, whip.
- **Transições:** auto, none, fade, slide, push, wipe, zoom, whip, lift, dive, iris, bands, bubble, leak, glitch, flip.
  "auto" usa `brand.motion.transitions` ou a energia da marca (calm, normal, playful).
- **Fundos:** auto, solid, gradient, mesh, particles, grid, shapes, aurora, ou `{ "type": "media", "media": ..., "dim": 0.5 }`.
- **Mídia:** caminho em `public/` ou `{ src, focus: {x,y}, fit, trim, muted: false, captions }`. Vídeo de banco ou
  de celular: converta para h264 1080 sem áudio (o `pnpm media get` já faz; arquivos do cliente, faça com ffmpeg).

## Tempo, música e efeitos

- Duração por cena = tempo de leitura (ritmo `pace`) ou locução + respiro, arredondada aos tempos da música
  (`music.bpm` ou `brand.audio.bpm`). Todo corte cai no tempo. `src/core/timeline.ts` é a fonte única.
- `music.mode`: `generate` (trilha original por código, sincronizada, climas upbeat/corporate/tech/calm/epic),
  `file` (arquivo em public, ex.: baixado com `pnpm audio:get`) ou `none`.
- Efeitos automáticos do pack `public/_lib/sfx` (whoosh nas transições, impact na logo, pop em listas, tick em números,
  chime no CTA, riser antes do fecho). No máximo 1 a cada 0,25 s. Para usar efeitos de banco, crie outro pack com os
  mesmos nomes e aponte `sfx.pack`.
- Áudio de banco: `pnpm audio:search` / `pnpm audio:get` (só CC0, CC-BY, PD; créditos em CREDITS.md).

## Locução, legendas e idiomas

- `voice.provider`: `piper` (local, grátis; vozes pt_BR-faber, pt_PT-tugão, en_US-lessac...; para Angola use
  pt_PT-tugão), `elevenlabs` (melhor, tempos exatos por palavra), `openai`. `voiceId` pode ser `"pt-BR=x,en=y"`.
- Legendas saem da locução (ou de `pnpm transcribe` para vídeo falado). `captions.mode` burn/file/both/none;
  `style` pop/line/box. Com legenda queimada, o layout reserva uma faixa embaixo (conteúdo nunca fica sob ela).
- Idiomas: `langs` no job + `jobs/<slug>/i18n/<lang>.json`. `pnpm video translate <slug> --to en` cria as chaves;
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

- Vai para o git: motor, scripts, schemas, marcas, jobs (JSON) e os exemplos próprios (`public/demo-30s`, `public/showcase`).
- Fica só na máquina: `public/<job>/` de clientes, `clientes/`, `out/`, `.env`. O `.gitignore` de `public/` é por lista de permitidos: material novo de cliente nunca entra por engano.
- Mudança no motor: `pnpm typecheck`, `pnpm test` e `pnpm video stills demo-30s` (renderiza na nuvem também) e olhe a folha de contato.
- Commits em inglês; registe a mudança no `CHANGELOG.md` e suba a versão do `package.json`.

## Regras de Remotion

- Skills em `.claude/skills/remotion-best-practices`.
- Animação só com `useCurrentFrame()` + `interpolate()`/`spring()`. CSS `transition`/`animation` não renderiza.
- Segundos via `fps`. Pacotes `@remotion/*` na mesma versão (`pnpm exec remotion add <pacote>`).
- `pnpm typecheck` antes de entregar mudanças no motor.
