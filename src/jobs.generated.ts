// GERADO por `pnpm video build`. Não edite: mude jobs/<slug>/job.json e rode o build.
import type { FormatKey, VideoProps } from "./core/schema";
import j0 from "../jobs/acai-promo/_build/pt-br.json";
import j1 from "../jobs/acai-promo/_build/en.json";
import j2 from "../jobs/demo-30s/_build/pt-br.json";
import j3 from "../jobs/ferrara-nomograma/_build/pt-br.json";
import j4 from "../jobs/mais-sabor-reels/_build/pt-ao.json";
import j5 from "../jobs/showcase/_build/pt-br.json";
import j6 from "../jobs/showcase/_build/en.json";

export const JOBS: { slug: string; lang: string; formats: FormatKey[]; props: VideoProps }[] = [
  { slug: "acai-promo", lang: "pt-BR", formats: ["9:16","16:9"], props: j0 as unknown as VideoProps },
  { slug: "acai-promo", lang: "en", formats: ["9:16","16:9"], props: j1 as unknown as VideoProps },
  { slug: "demo-30s", lang: "pt-BR", formats: ["16:9","9:16"], props: j2 as unknown as VideoProps },
  { slug: "ferrara-nomograma", lang: "pt-BR", formats: ["16:9"], props: j3 as unknown as VideoProps },
  { slug: "mais-sabor-reels", lang: "pt-AO", formats: ["9:16"], props: j4 as unknown as VideoProps },
  { slug: "showcase", lang: "pt-BR", formats: ["16:9","9:16"], props: j5 as unknown as VideoProps },
  { slug: "showcase", lang: "en", formats: ["16:9","9:16"], props: j6 as unknown as VideoProps },
];
