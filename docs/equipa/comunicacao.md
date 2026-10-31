# Comunicação

Referência obrigatória: `CLAUDE.md` deste repositório (princípio "um vídeo novo é um job em JSON", estrutura, comandos, fluxo, tipos de cena, tempo e música). Esta página só distribui responsabilidades.

- **Regra da casa:** vídeo é motion gráfico no Remotion. Pessoas e cenas reais só de banco gratuito (`pnpm media search|get`: Pixabay, Pexels, Unsplash, Openverse), licença conferida, crédito em `CREDITOS.md`. Nunca gerar pessoas por IA.
- **Pesquisa de material:** material. Ordem: pastas do cliente (`C:\sites\<cliente>`, `_FILES`, `FOTOS`, tokens do projeto), site do cliente (`pnpm brand new <marca> --from <site>`), bancos. Folha de contato numerada (ffmpeg) em `out/<slug>/` antes de escolher. Vídeo de banco: h264 1080 sem áudio (o `media get` já faz). Registro em `jobs/<slug>/material.md`.
- **Roteiro:** roteiro em `jobs/<slug>/job.json` (schema em `schemas/job.schema.json`). Cenas nativas primeiro: cover, statement, stats, list, screen, quote, cta, logo; `media`/`split` só quando precisa de imagem real. [colchetes] marcam destaque. Reels 20 a 35 s, gancho nos 2 s iniciais.
- **Direção de arte:** `brands/<marca>.json` (cores, fontes @fontsource via `pnpm brand font`, logo, `motion.energy`, BPM, transições). Fonte condensada: `scale` 1.3 e talvez `uppercase`; logo sem contraste: `plate`. Por cena: `camera`, `transition`, `background`, `sfx`. Revisa a folha de stills.
- **Locução e legendas:** `pnpm video voice <slug> [--lang all]` (Piper local por padrão), `pnpm transcribe`, `pnpm video translate --to <lang> [--auto]`; tradução revisa pt-PT e pt-AO.
- **Montagem:** `pnpm video build`, `stills`, `render [--format all] [--lang all] [--draft]`; QC com quadros nas transições e loudness -14 a -16 LUFS; entrega em `clientes/<client>/<slug>/<data>/` (nunca sobrescreve; `-v2`). `pnpm video doctor` quando algo falha.
- **Produção:** registra cada passagem em `jobs/<slug>/producao.md`.
- Componente novo no motor só se um tipo de cena não existir, no `src/template`, genérico por props, nunca por cliente: isso é decisão do Marcus, registrar em `docs/equipa/dividas.md`.
- `src/cms*`, `src/acai-mg`: legado, não usar como modelo.
