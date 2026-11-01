# Referência do job

Detalhes para escrever o `job.json` e o `brand.json`. O schema completo está no `$schema` de cada arquivo.

## Tipos de cena (campo "type")

cover, statement, media (foto/vídeo tela cheia), split (texto + mídia), screen (print em browser/celular com push-in
e pan), list, stats (números contando), gallery (grid, carousel, stack), quote, cta (botão + contatos), logo, e as cenas
que fogem do visual de slide:

- **chart**: gráfico animado. `kind` bar | column | line | donut, `items: [{ label, value }]`, `prefix`, `suffix`,
  `decimals`, `eyebrow`, `title`. O maior valor ganha a cor de destaque.
- **kinetic**: tipografia cinética, uma palavra por tempo da música. `text` (com [destaque]), `style` pop (uma palavra
  gigante por vez) | stack (empilha) | slide (desliza em linha). Ótima para gancho e virada de ritmo.
- **lottie**: animação Lottie (`src`: .json na pasta do job ou URL). `loop`, `speed`, `eyebrow`, `title`, `text`
  (com texto, a animação vai para o lado). Animações grátis do LottieFiles têm uso comercial permitido.
- **object3d**: objeto 3D com luz nas cores da marca. `object` card | phone | box (com `media`: a imagem vira textura)
  ou logo (extruda o logo SVG da marca; o SVG precisa ter o texto convertido em contorno, `<text>` não vira 3D).
- **map**: mapa grátis (OpenFreeMap/OpenStreetMap, sem chave) com marcadores e rota animada.
  `points: [{ lat, lng, label }]`, `route` (padrão true), `zoom`, `eyebrow`, `title`. Precisa de internet no render.

Campos comuns: `id`, `voice`, `duration`, `transition`, `camera`, `background`, `sfx`.
O `check` avisa quando o roteiro tem cara de slideshow (3 ou mais cenas seguidas só de texto, ou pouco visual):
intercale mídia, gráfico, 3D, mapa, Lottie ou tipografia cinética.

- **Câmera:** auto, static, in, out, left, right, up, down, push, pull, orbit, tilt, handheld, dolly, whip.
- **Transições:** auto, none, fade, slide, push, wipe, zoom, whip, lift, dive, iris, bands, bubble, leak, glitch, flip,
  rgb (separação de canais), zoomblur (zoom com desfoque radial), pixelate, clock (relógio), checker (tabuleiro).
  A câmera `whip` ganha desfoque de movimento de verdade (subquadros).
  "auto" usa `brand.motion.transitions` ou a energia da marca (calm, normal, playful).
- **Fundos:** auto, solid, gradient, mesh, particles, grid, shapes, aurora, ou `{ "type": "media", "media": ..., "dim": 0.5 }`.
- **Look de cor** (`brand.json`, `"grade"`): warm, cool, teal-orange, film, mono, ou `{ "lut": "luts/x.cube" }` (LUT
  próprio ao lado do brand.json). Aplicado no render, na thumb e nos stills.
- **Imagens por IA** (sem pessoas: fundos, objetos, texturas, ilustrações): `media gen --prompt "..." --out
  <job>/img/x.jpg [--variants 4] [--style "3d render"]`. FLUX schnell no Cloudflare (grátis, ~170 imagens/dia, uso
  comercial); usa a paleta do brand.json; com `--variants` gera opções lado a lado para escolher.
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

- `voice.provider`: `kokoro` (local, grátis, mais natural; pt-BR pf_dora, pm_alex, pm_santa; requer
  `pip install kokoro-onnx soundfile`), `piper` (local, grátis; pt_BR-faber, pt_PT-tugão, en_US-lessac...; para
  Portugal e Angola use pt_PT-tugão, o Kokoro só tem pt-BR), `elevenlabs` (melhor, tempos exatos por palavra), `openai`. `voiceId` pode ser `"pt-BR=x,en=y"`.
- Legendas saem da locução (ou de `pnpm transcribe` para vídeo falado). `captions.mode` burn/file/both/none;
  `style` pop/line/box. Com legenda queimada, o layout reserva uma faixa embaixo (conteúdo nunca fica sob ela).
  A legenda da locução não é queimada quando repete o texto da tela (`captions.whenOnScreen: "show"` força);
  toda legenda fica sobre placa escura com contraste AA e a palavra falada vira pílula na cor de destaque.
- Idiomas: `langs` no job + `<job>/i18n/<lang>.json`. `video translate <job> --to en` cria as chaves;
  preencha você mesmo (no chat) ou use `--auto` (DeepL/Claude/OpenAI se houver chave). Depois rode `voice --lang en`.

## QC

O render termina com uma revisão automática (também `video qc <job>`): resolução, duração, áudio, tela preta,
imagem parada por 3 s ou mais, silêncio e loudness (com trilha ou locução), e quatro quadros numa folha em
`<job>/out/qc/`. Problema (✗) faz o render sair com erro; aviso (!) é para olhar.

## Rede e chaves

- Chaves no `.env` do motor (vêm da configuração do plugin; na 1ª preparação, o `.env` de uma instalação antiga do reel
  é aproveitado). Nunca leia nem imprima esse arquivo; `video doctor` mostra só a presença.
- 3D e mapa usam WebGL: no Windows e no Mac o render usa a GPU (`angle`); sem GPU (Linux, nuvem) usa software
  (`swangle`). `REEL_GL` troca, se precisar.
- Pexels está com emissão de chaves pausada: use Pixabay (fotos e vídeos) e Unsplash (fotos).
- Sites bloqueados por proxy: não contorne; peça ao Marcus para liberar o domínio ou use outra fonte.
