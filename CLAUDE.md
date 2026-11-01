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
src/template/              composição "Video" + 16 tipos de cena (scenes, scenes-extra, scene-3d, scene-map); demo.ts = marca neutra
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
pnpm video qc <job>               # revisa a última entrega (o render já roda no fim): preto, parado, silêncio, loudness
pnpm video studio <job>           # Studio com o job (material servido direto da pasta do cliente)
pnpm video translate <job> --to en [--auto]
pnpm video doctor                 # ferramentas, chaves (só presença) e rede
pnpm test                         # testes (REEL_E2E=1 inclui o ponta a ponta com render)

pnpm media search --type photo|video --q "termo" --orientation portrait --sheet
pnpm media get --source pixabay|unsplash|pexels|openverse --id <id> --out <job>/stock/<nome>.jpg
pnpm media gen --prompt "..." --out <job>/img/x.jpg [--variants 4]   # imagem por IA (FLUX, Cloudflare, grátis; sem pessoas)
pnpm transcribe <job>/clips/fala.mp4 --lang pt   # Whisper local -> legendas por palavra
pnpm dev                          # Studio do motor (marca neutra)
```

## Uso (fluxo de um vídeo novo e referência do job)

A fonte única é a skill do plugin: [skills/video/SKILL.md](skills/video/SKILL.md) (fluxo, comandos, regras) e
[skills/video/referencia.md](skills/video/referencia.md) (tipos de cena, câmera, transições, fundos, mídia, trilha,
efeitos, locução, legendas, idiomas, chaves). Ao produzir um vídeo a partir deste repositório, siga a skill trocando
`pnpm --dir "<motor>"` por `pnpm`.

## Plugin

O repositório é também o plugin `reel` do Claude Code (`.claude-plugin/plugin.json` + `marketplace.json`):
`claude plugin marketplace add marcuswd/reel` e `claude plugin install reel@reel`. Instalado, o motor roda de uma
cópia em `${CLAUDE_PLUGIN_DATA}/motor` preparada por `scripts/plugin/setup.mjs` (hook `SessionStart` em segundo plano
e passo 0 da skill): copia o código quando a versão muda e roda `pnpm install` só quando o lock muda.
A versão do plugin acompanha a do `package.json` (as duas sobem juntas).

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
