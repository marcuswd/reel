# Changelog

## 0.10.0 (2026-11-08)

Dark mode, slice 1: a 9:16 short from one theme, with one recipe and three environments.

- New `dark3d` scene (Three.js, deterministic, seeded) with three environments: `corredor` (corridor), `poeira` (dust) and `vazio` (void). Text is always 2D on top; fake glow by additive sprites.
- Recipes `dark/noir-frio` and `dark/curiosidades`: style and narration defaults applied to the job. `pnpm video new <dir> --recipe dark/noir-frio+curiosidades` loads them (the client brand shrinks to cta/logo) and `pnpm video recipes` lists them. The narration recipe defaults to the Kokoro voice (`pm_alex`, pt-BR); licenses are kept in `recipe.json`.
- Barlow Condensed for the noir-frio look, fetched through `@fontsource`.
- Music mood `drone` in the generator (low, slow, around 60 bpm).
- Skill `reel:dark`: asks the questions, writes `roteiro.md`, stops for review and builds `job.json` by hand.

## 0.9.1 (2026-11-08)

- Pastas novas da empresa nos exemplos e na documentação: os vídeos de um cliente moram em `C:\Users\marcu\MARCUSWD\clientes\<cliente>\videos` e o motor em `projetos\mwd-ai-video`. Na primeira instalação, o plugin também aproveita o `.env` dessa pasta nova.

## 0.9.0 (2026-11-07)

- Catálogo de referências por segmento para pequenas e médias empresas: `pnpm video modelos` lista e `pnpm video new <pasta> --brand <marca> --modelo <id>` cria o job a partir do roteiro (loja, restaurante, imovel, servico, lancamento), com ritmo, trilha e formatos do segmento, e diz o material a pedir ao cliente. Os modelos moram em `src/template/modelos.ts` e um teste garante que cada um vira um job válido terminando na chamada.

## 0.8.1 (2026-11-01)

Correções vindas do primeiro vídeo completo renderizado com a 0.8.0.

- O render normaliza o áudio da entrega para -15 LUFS e pico de -1,5 dBTP (ffmpeg loudnorm em duas passadas, linear quando possível, vídeo copiado sem recodificar). Antes a mixagem de trilha e locução saía perto de -19 LUFS e o QC reclamava.
- QC: trecho que o `blackdetect` acusa como preto, mas tem texto ou logo claro (brilho máximo de um quadro do meio, via `signalstats`), deixa de ser problema e vira aviso de "quadro escuro e quase vazio". Marcas de fundo escuro não travam mais a entrega por alarme falso.
- `schemas/job.schema.json` e `schemas/brand.schema.json` regenerados: a 0.8.0 subiu sem as cenas e campos novos (`grade` da marca, `chart`, `kinetic`, `lottie`, `object3d`, `map` e as transições novas). Um teste agora falha se os schemas ficarem para trás do zod.

## 0.8.0 (2026-11-01)

Melhorias a partir da pesquisa de ferramentas parecidas (OpenMontage, claude-code-video-toolkit, APIs de vídeo por JSON e geradores por IA), todas sem custo.

- Cenas novas: `chart` (barra, coluna, linha, rosca, com contagem), `kinetic` (tipografia cinética no tempo da música: pop, stack, slide), `lottie` (animações do LottieFiles), `object3d` (cartão, celular ou caixa com a imagem como textura, ou o logo SVG extrudado, com Three.js) e `map` (MapLibre + OpenFreeMap, sem chave, com marcadores e rota animada).
- Transições novas: `rgb`, `zoomblur`, `pixelate`, `clock`, `checker`; câmera `whip` com motion blur de verdade (`@remotion/motion-blur`).
- Look de cor por marca (`brand.grade`: warm, cool, teal-orange, film, mono ou um `.cube` próprio), gerado por código e aplicado pelo ffmpeg no render, na thumb e nos stills.
- `pnpm media gen`: imagens por IA grátis (FLUX schnell no Cloudflare Workers AI, ~170/dia, uso comercial), com a paleta da marca no prompt, nunca pessoas, variações com folha para escolher e registro em CREDITS.md. Chaves `CF_ACCOUNT_ID` e `CF_API_TOKEN` (também nas opções do plugin).
- QC automático no fim do render e `pnpm video qc`: resolução, duração, áudio, tela preta, imagem parada, silêncio e loudness (com trilha ou locução), quatro quadros numa folha; problema faz o render sair com erro.
- `check` avisa cara de slideshow (3+ cenas seguidas só de texto, ou pouco visual) e confere o `.json` do Lottie, a imagem do 3D e o `.cube` da marca.
- Locução local `kokoro` (kokoro-onnx, CPU, modelo de ~120 MB baixado na 1ª vez): pt-BR pf_dora, pm_alex, pm_santa; `doctor` confere.
- WebGL nos stills e no render: GPU (`angle`) no Windows e Mac, software (`swangle`) no Linux; `REEL_GL` troca.
- O worker do MapLibre vai no bundle (copiado no `postinstall` para `public/vendor`), sem depender de CDN.

## 0.7.0 (2026-11-01)

- O repositório é um plugin do Claude Code: `claude plugin marketplace add marcuswd/reel` e `claude plugin install reel@reel`; atualiza com `claude plugin marketplace update reel` e `claude plugin update reel@reel`.
- Skill `/reel:video`: fluxo completo de um vídeo (preparar o motor, briefing, material, marca, job, check, stills, render, QC, entrega), com a referência do job em `skills/video/referencia.md`. As 12 skills oficiais do Remotion vão junto (`reel:remotion-*`).
- `scripts/plugin/setup.mjs` prepara o motor em `${CLAUDE_PLUGIN_DATA}/motor`, que sobrevive às atualizações: copia o código quando a versão muda, roda `pnpm install` só quando dependências ou lock mudam (senão refaz só o `postinstall`), trava contra duas preparações ao mesmo tempo e ignora `--data` vazio ou não substituído (nunca usa a pasta atual). Roda em segundo plano no `SessionStart` e como passo 0 da skill.
- Chaves de API como opções do plugin (pedidas ao habilitar; sensíveis no cofre de credenciais), gravadas no `.env` do motor; na 1ª preparação, o `.env` de `C:\sites\remotion-base` (ou `REEL_DIR`) é aproveitado.
- O fluxo e a referência de uso saem do `CLAUDE.md` (que fica para quem desenvolve o motor) e passam a morar na skill. Ícone do plugin.

## 0.6.1 (2026-10-31)

- Caminhos passados pelo usuário (pasta do job, `brand new|font|show`, `--dest`, `transcribe`, `media get --out`, `audio:get --out`) são resolvidos a partir da pasta de onde o comando foi chamado. Assim a skill roda `pnpm --dir <motor> video stills ./videos/promo` de dentro do projeto do cliente (o pnpm muda para a pasta do motor, mas guarda a original em `INIT_CWD`).
- README: instalação e atualização do motor e uso a partir do projeto do cliente.

## 0.6.0 (2026-10-31)

- `pnpm video check <pasta>`: valida job e marca sem renderizar. Erros (saída 1): campo inválido do schema com o caminho exato, id de cena repetido, arquivo de mídia, legenda (por idioma), música, efeito ou fonte/logo da marca que não existe. Avisos: tradução ausente ou incompleta, locução faltando.
- `stills` e `render` rodam o check antes e param com a lista de erros, em vez de falhar no meio do render.
- `scripts/lib/check.ts` é puro (disco injetado) e tem testes; o ponta a ponta também roda o check.

## 0.5.0 (2026-10-31)

- Tudo de um vídeo mora na pasta do cliente. Todo comando recebe a pasta do job: `pnpm video new|build|voice|music|translate|plan|stills|render|studio <pasta>`. Lá ficam `job.json`, `i18n/`, material, locução, trilha, `_build/`, `out/` (stills e folhas) e `entregas/<data>/` (ou `--dest`). Nada é gravado no repositório.
- Marca: `brand.json` na pasta do job, na de cima (compartilhada pelos vídeos do cliente) ou em `../brands/<nome>.json`; ou `"brand": "caminho/brand.json"`. Fontes e logo ficam ao lado dela. `pnpm brand new|font|show <pasta>`.
- Caminhos de mídia no job e na marca são relativos às suas pastas (`img/foto.jpg`, `fonts/x.woff2`); `scripts/lib/workspace.ts` os traduz para a `public` do bundle. No render o material é copiado só para o bundle temporário (da pasta da marca, só os arquivos que o `brand.json` usa); no Studio entra por junction, sem cópia e sem exigir admin no Windows.
- `pnpm video studio <pasta>` abre o job no Studio e, ao fechar, esvazia de novo o `src/jobs.generated.ts`.
- `pnpm video new` não gera a trilha (sai no build/render, com as cenas de verdade).
- Saem `EXPORT_DIR`, `scripts/export.mjs` e `pnpm export`: a entrega já sai na pasta do job.
- Testes da pasta do job e teste de ponta a ponta (`REEL_E2E=1`, ligado no CI): pasta temporária de cliente → new, stills e render, conferindo que o repositório não muda.

## 0.4.0 (2026-10-31)

- O repositório passa a levar só o motor. Saem todas as marcas (`brands/*.json`), todos os jobs (`jobs/*`, inclusive os exemplos `demo-30s` e `showcase`) e o material versionado (`public/brands/marcuswd`, `public/demo-30s`, `public/showcase`). O `.gitignore` exclui `jobs/`, `brands/` e `public/*` (menos `_lib`).
- A composição padrão do Studio (`src/template/demo.ts`) usa uma marca neutra embutida em vez da marca MARCUSWD.
- `pnpm video new` exige `--brand`.
- CI: typecheck e testes (sem build de exemplos).
- Documentação: entrega na pasta do cliente com `render --dest`; verificação visual do motor pelo still da composição padrão.

## 0.3.0 (2026-10-31)

- Legenda queimada só quando acrescenta: a legenda da locução não é queimada nas cenas em que 60% ou mais das palavras faladas já estão escritas na tela (`captions.whenOnScreen`, padrão `"hide"`; `"show"` volta ao comportamento anterior). O `.srt`/`.vtt` continua completo; vídeo falado é sempre queimado. Sem nada para queimar, a faixa reservada embaixo some.
- Contraste AA em todo estilo de legenda: placa preta a 62% (branco passa no AA até sobre fundo branco) e palavra falada em pílula na cor de destaque, com texto preto ou branco escolhido por contraste. Medido nos stills do showcase sobre foto clara: 5,4:1 (16:9) e 9,4:1 (9:16).
- A legenda entra sem fade de opacidade (nenhum quadro sai apagado) e a última palavra da frase não fica sozinha numa página.
- `src/core/color.ts` (luminância, contraste, composição) com testes, incluindo a cor de destaque de todas as marcas.
- `pnpm video plan` mostra quantas palavras são queimadas.

## 0.2.2 (2026-10-31)

- Testes do motor puro em `src/core/*.test.ts` (timeline, srt, schema): duração por cena, ritmo, `duration` forçada, locução, cortes no tempo da música (bpm do job e da marca), encadeamento das cenas, espaçamento dos efeitos, legendas da locução e de vídeo falado (com trim), SRT/VTT e mensagens de erro do schema por campo.
- Todo `jobs/*/job.json` e `brands/*.json` do repositório é validado pelo schema no `pnpm test`.
- `src/core/testing.ts`: fábricas de marca, job e props para os testes.

## 0.2.1 (2026-10-31)

- Folha de contato: no Windows o ffmpeg era chamado pelo cmd.exe e o `|` do layout do xstack virava pipe. `run` e `has` agora chamam executáveis sem shell em qualquer sistema; só atalhos `.cmd`/`.bat` passam pelo shell, com aspas.
- Folha de contato em `scripts/lib/sheet.ts`, usada por `pnpm video stills` e `pnpm media search --sheet`: posição por pixel e job de uma cena só (antes o xstack exigia 2 entradas).
- `pnpm video doctor`: a checagem de numpy/scipy e piper também passava pelo cmd.exe e falhava no Windows.
- `pnpm test` (runner do Node via tsx), com teste da folha rodando o ffmpeg de verdade numa pasta com espaço; roda no CI.

## 0.2.0 (2026-10-31)

- Repositório próprio: github.com/marcuswd/reel (privado). Material e entregas de clientes ficam fora do git.
- Composições antigas feitas à mão (CmsTis, CmsTisV2/V4/V5, AcaiMg, Intro, cenas de exemplo) saem do motor; ficam no ramo `legado`.
- `src/jobs.generated.ts` deixa de ser versionado; `pnpm video index` recria e roda no `pnpm install`.
- `pnpm-workspace.yaml` com `esbuild` liberado (o valor era um marcador sem efeito).
- CI: typecheck e build dos jobs de exemplo a cada push.

## 0.1.0 (2026-10-31)

- Versão inicial importada do `C:\sites\remotion-base`.
