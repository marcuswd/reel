// Arquivos de terceiros servidos pelo bundle (roda no postinstall): fontes Inter e o worker do MapLibre.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const src = join(dirname(require.resolve("@fontsource/inter/package.json")), "files");
mkdirSync("public/fonts", { recursive: true });
for (const w of ["400", "600", "800"]) {
  copyFileSync(join(src, `inter-latin-${w}-normal.woff2`), `public/fonts/Inter-${w}.woff2`);
}
console.log("Fontes Inter copiadas para public/fonts");

// Worker do MapLibre (cena "map") servido pelo próprio bundle, sem depender de CDN no render.
const maplibre = dirname(require.resolve("maplibre-gl/package.json"));
mkdirSync("public/vendor", { recursive: true });
copyFileSync(join(maplibre, "dist", "maplibre-gl-worker.mjs"), "public/vendor/maplibre-gl-worker.mjs");
console.log("Worker do MapLibre copiado para public/vendor");
