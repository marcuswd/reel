# Referência do job

Detalhes para escrever o `job.json` e o `brand.json`. O schema completo está no `$schema` de cada arquivo.

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
- Áudio de banco: `pnpm --dir "<motor>" audio:search` / `audio:get --out <job>/audio/<nome>.mp3` (só CC0, CC-BY, PD; créditos em CREDITS.md).

## Locução, legendas e idiomas

- `voice.provider`: `piper` (local, grátis; vozes pt_BR-faber, pt_PT-tugão, en_US-lessac...; para Angola use
  pt_PT-tugão), `elevenlabs` (melhor, tempos exatos por palavra), `openai`. `voiceId` pode ser `"pt-BR=x,en=y"`.
- Legendas saem da locução (ou de `pnpm transcribe` para vídeo falado). `captions.mode` burn/file/both/none;
  `style` pop/line/box. Com legenda queimada, o layout reserva uma faixa embaixo (conteúdo nunca fica sob ela).
  A legenda da locução não é queimada quando repete o texto da tela (`captions.whenOnScreen: "show"` força);
  toda legenda fica sobre placa escura com contraste AA e a palavra falada vira pílula na cor de destaque.
- Idiomas: `langs` no job + `<job>/i18n/<lang>.json`. `video translate <job> --to en` cria as chaves;
  preencha você mesmo (no chat) ou use `--auto` (DeepL/Claude/OpenAI se houver chave). Depois rode `voice --lang en`.

## Rede e chaves

- Chaves no `.env` do motor (vêm da configuração do plugin; na 1ª preparação, o `.env` de uma instalação antiga do reel
  é aproveitado). Nunca leia nem imprima esse arquivo; `video doctor` mostra só a presença.
- Pexels está com emissão de chaves pausada: use Pixabay (fotos e vídeos) e Unsplash (fotos).
- Sites bloqueados por proxy: não contorne; peça ao Marcus para liberar o domínio ou use outra fonte.
