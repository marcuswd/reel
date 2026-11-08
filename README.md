# reel

Gerador de vídeos da MARCUSWD sobre Remotion 4. Um vídeo é um **job em JSON** (roteiro) + uma **marca em JSON**
(identidade). O motor monta cenas, câmera, transições, trilha sincronizada, efeitos, locução, legendas e idiomas,
e renderiza em qualquer formato.

## Instalar como plugin do Claude Code

```powershell
claude plugin marketplace add marcuswd/reel
claude plugin install reel@reel
```

Ou, numa sessão do Claude Code: `/plugin install reel --marketplace marcuswd/reel`. O repositório é privado: o
Claude Code usa as credenciais do git da máquina (as mesmas do `git clone`).

Ao habilitar, o Claude Code pergunta as chaves de API (todas opcionais: Pixabay, Unsplash, ElevenLabs, OpenAI,
DeepL…). Na primeira sessão o plugin copia o motor para a pasta persistente dele e roda `pnpm install` (1 a 2
minutos, em segundo plano); se existir um `.env` em `C:\sites\remotion-base` (ou em `REEL_DIR`), as chaves dele são
aproveitadas. Requer Node 20+, pnpm e ffmpeg; para trilha gerada e locução local, `pip install numpy scipy piper-tts`.

Usar: abra o projeto do cliente e peça o vídeo, ou chame `/reel:video <pedido>`.

Atualizar:

```powershell
claude plugin marketplace update reel
claude plugin update reel@reel
```

Na sessão seguinte o motor novo é copiado; o `pnpm install` só roda de novo quando as dependências mudam.

## Instalar para desenvolver o motor

```powershell
git clone https://github.com/marcuswd/reel.git C:\sites\remotion-base
cd C:\sites\remotion-base
copy .env.example .env
pnpm install
pnpm video doctor
```

Para testar o plugin a partir desta pasta: `claude plugin marketplace add C:\sites\remotion-base` (as edições
valem na sessão seguinte ou com `/reload-plugins`).

## Em 5 comandos (pasta do motor)

Com o plugin, a skill roda estes comandos sozinha (`pnpm --dir <motor> ...`). À mão, da pasta do motor:

```bash
pnpm brand new "C:\sites\cliente\videos" --from https://cliente.com      # brand.json + logo
pnpm video new "C:\sites\cliente\videos\promo" --brand cliente --format 9:16
# edite promo\job.json e coloque o material em promo\ (caminhos relativos: "img/foto.jpg")
pnpm video voice "C:\sites\cliente\videos\promo"     # se tiver locução
pnpm video check "C:\sites\cliente\videos\promo"     # valida sem renderizar (diz o campo e o arquivo)
pnpm video stills "C:\sites\cliente\videos\promo"    # folha de contato em promo\out\
pnpm video render "C:\sites\cliente\videos\promo" --format all --lang all
```

A entrega vai para `promo\entregas\<AAAA-MM-DD>\` (ou `--dest <pasta>`): mp4, thumb, `.srt`, `.vtt` e créditos.
Nada é sobrescrito (cria `-v2`). `pnpm video studio <pasta>` abre o job no Studio.

```
C:\sites\cliente\videos\
  brand.json, logo.svg, fonts\        marca (compartilhada pelos vídeos do cliente)
  promo\
    job.json, i18n\<lang>.json        roteiro e traduções
    img\, video\, stock\              material
    voice\, audio\generated\          locução e trilha geradas
    _build\, out\                     gerados (props, stills, folhas)
    entregas\<data>\                  vídeo final
```

O repositório leva só o motor: nenhuma marca, job, material ou entrega entra nele.

## Job (<pasta>/job.json)

```json
{
  "$schema": "../../../remotion-base/schemas/job.schema.json",
  "slug": "promo",
  "brand": "cliente",
  "lang": "pt-BR",
  "formats": ["9:16"],
  "music": { "mode": "generate", "mood": "upbeat", "bpm": 124 },
  "voice": { "provider": "piper" },
  "captions": { "mode": "both", "style": "pop" },
  "scenes": [
    { "id": "abertura", "type": "cover", "logo": true, "title": "Produto com [mais sabor]",
      "media": { "src": "video/fabrica.mp4" }, "voice": "..." },
    { "id": "produtos", "type": "gallery", "title": "Escolha o seu [preferido]", "items": ["img/a.jpg", "img/b.jpg"] },
    { "id": "pedido", "type": "cta", "title": "Peça [já]", "button": "WhatsApp",
      "contact": [{ "kind": "whatsapp", "value": "+55 ..." }] }
  ]
}
```

`brand` é um nome (procura `brand.json` na pasta do job e na de cima) ou um caminho para `.json`.
Tipos de cena: `cover`, `statement`, `media`, `split`, `screen`, `list`, `stats`, `gallery`, `quote`, `cta`, `logo`.
O VS Code completa e valida os campos pelo `$schema` (o `pnpm video new` já aponta para o schema do motor).

## Recursos

| Área | O que tem |
| --- | --- |
| Câmera | Ken Burns in/out, pans, push/pull ao foco, orbit 3D, tilt, handheld (ruído), dolly, whip com motion blur de verdade, paralaxe |
| Transições | fade, slide, push, wipe, flip, zoom, whip, lift, dive, iris, bands, bubble, light leak, glitch, rgb, zoomblur, pixelate, clock, checker; cores da marca |
| Cenas | capa, frase, mídia, split, tela, lista, números, galeria, citação, CTA, logo, gráfico (barra, coluna, linha, rosca), tipografia cinética, Lottie, objeto 3D (cartão, celular, caixa, logo extrudado) e mapa com rota |
| Fundos e cor | mesh, aurora, partículas, grid 3D, formas, gradiente, foto/vídeo escurecido; grão, vinheta e look de cor por marca (LUT) |
| Formatos | 16:9, 9:16, 1:1, 4:5 com layout responsivo e área segura configurável |
| Trilha | gerada por código e sincronizada aos cortes (upbeat, corporate, tech, calm, epic, drone) ou arquivo de banco |
| Efeitos | pack próprio sem licença, mapeado aos eventos da timeline |
| Locução | Kokoro e Piper (locais, grátis), ElevenLabs, OpenAI; duração das cenas segue a fala; ducking da trilha |
| Legendas | palavra a palavra (pop, line, box) com contraste AA, só quando acrescentam; export `.srt`/`.vtt`; Whisper local para vídeo falado |
| Idiomas | `i18n/<lang>.json` por job, tradução assistida (DeepL/Claude/OpenAI) e locução por idioma |
| Mídia | busca e download com crédito (Pixabay, Unsplash, Pexels, Openverse) e imagens por IA grátis (FLUX no Cloudflare, sem pessoas); folha de contato para escolher |
| Qualidade | `check` antes (campos, arquivos, cara de slideshow) e QC depois do render (preto, imagem parada, silêncio, loudness, quadros) |
| Marca | rascunho a partir do site (cores, fontes, logo) e fontes do @fontsource |

## Repositório

- Só o motor: `src`, `scripts`, `schemas`, `public/_lib` (efeitos), docs e testes. `src/jobs.generated.ts` é gerado (vazio, ou com o job aberto pelo `pnpm video studio`).
- As composições antigas feitas à mão saíram do motor; estão no ramo `legado`.
- Próximos passos: [docs/backlog.md](docs/backlog.md). Mudanças: [CHANGELOG.md](CHANGELOG.md).

## Licença do Remotion

Gratuito para pessoas físicas e empresas de até 3 pessoas. Acima disso exige licença: https://www.remotion.pro/license
