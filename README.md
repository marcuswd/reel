# reel

Gerador de vídeos da MARCUSWD sobre Remotion 4. Um vídeo é um **job em JSON** (roteiro) + uma **marca em JSON**
(identidade). O motor monta cenas, câmera, transições, trilha sincronizada, efeitos, locução, legendas e idiomas,
e renderiza em qualquer formato.

## Instalação

```bash
git clone https://github.com/marcuswd/reel.git && cd reel
cp .env.example .env                # preencha só as chaves que for usar
pnpm install
pip install numpy scipy piper-tts   # trilha/efeitos gerados e locução local
pnpm sfx                            # pack de efeitos (public/_lib/sfx), se ainda não existir
pnpm video doctor                   # confere ferramentas, chaves e rede
```

Requer Node 20+, ffmpeg e Python 3. Chaves opcionais no `.env` (veja `.env.example`).

## Em 5 comandos

```bash
pnpm video new promo-x --brand marcuswd --client cliente-x --format 9:16
# edite jobs/promo-x/job.json (cenas) e coloque os assets em public/promo-x/
pnpm video voice promo-x            # se tiver locução
pnpm video stills promo-x           # confere um quadro por cena (out/promo-x/sheet-*.jpg)
pnpm video render promo-x --format all --lang all
```

O repositório leva o motor, as marcas e os exemplos próprios (`demo-30s`, `showcase`). Material e entregas de clientes (`public/<job>/`, `clientes/`, `out/`) ficam só na máquina: o `.gitignore` já os exclui.

A entrega vai para `clientes/<client>/<slug>/<AAAA-MM-DD>/` (ou `EXPORT_DIR`): mp4, thumb, `.srt`, `.vtt` e créditos.
Nada é sobrescrito (cria `-v2`).

## Job (jobs/<slug>/job.json)

```json
{
  "$schema": "../../schemas/job.schema.json",
  "slug": "mais-sabor-reels",
  "client": "mais_sabor",
  "brand": "mais-sabor",
  "lang": "pt-AO",
  "formats": ["9:16"],
  "music": { "mode": "generate", "mood": "upbeat", "bpm": 124 },
  "voice": { "provider": "piper", "voiceId": "pt_PT-tugão-medium" },
  "captions": { "mode": "both", "style": "pop" },
  "scenes": [
    { "id": "abertura", "type": "cover", "logo": true, "title": "Salgados com [mais sabor]",
      "media": { "src": "mais-sabor/video/maquina.mp4" }, "voice": "Mais Sabor..." },
    { "id": "produtos", "type": "gallery", "title": "Escolha o seu [preferido]", "items": ["mais-sabor/img/a.jpg", "..."] },
    { "id": "pedido", "type": "cta", "title": "Peça [já]", "button": "WhatsApp",
      "contact": [{ "kind": "whatsapp", "value": "+244 ..." }] }
  ]
}
```

Tipos de cena: `cover`, `statement`, `media`, `split`, `screen`, `list`, `stats`, `gallery`, `quote`, `cta`, `logo`.
O VS Code completa e valida os campos pelo `$schema` (gerado por `pnpm video build`).

## Recursos

| Área | O que tem |
| --- | --- |
| Câmera | Ken Burns in/out, pans, push/pull ao foco, orbit 3D, tilt, handheld (ruído), dolly, whip com motion blur, paralaxe |
| Transições | fade, slide, push, wipe, flip, zoom, whip, lift, dive, iris, bands, bubble, light leak (CSS), glitch; cores da marca |
| Fundos | mesh, aurora, partículas, grid 3D, formas, gradiente, foto/vídeo escurecido; grão e vinheta |
| Formatos | 16:9, 9:16, 1:1, 4:5 com layout responsivo e área segura configurável |
| Trilha | gerada por código e sincronizada aos cortes (upbeat, corporate, tech, calm, epic) ou arquivo de banco |
| Efeitos | pack próprio sem licença, mapeado aos eventos da timeline |
| Locução | Piper (local), ElevenLabs, OpenAI; duração das cenas segue a fala; ducking da trilha |
| Legendas | palavra a palavra (pop, line, box), faixa reservada no layout, export `.srt`/`.vtt`; Whisper local para vídeo falado |
| Idiomas | `i18n/<lang>.json` por job, tradução assistida (DeepL/Claude/OpenAI) e locução por idioma |
| Mídia | busca e download com crédito: Pixabay, Unsplash, Pexels, Openverse; folha de contato para escolher |
| Marca | rascunho a partir do site (cores, fontes, logo) e fontes do @fontsource |

## Repositório

- O índice de jobs do Studio (`src/jobs.generated.ts`) e os `jobs/<slug>/_build/` são gerados: `pnpm install` cria o índice e `pnpm video build` atualiza.
- As composições antigas feitas à mão (CmsTis, AcaiMg, Intro) saíram do motor; estão no ramo `legado`.
- Próximos passos: [docs/backlog.md](docs/backlog.md). Mudanças: [CHANGELOG.md](CHANGELOG.md).

## Licença do Remotion

Gratuito para pessoas físicas e empresas de até 3 pessoas. Acima disso exige licença: https://www.remotion.pro/license
