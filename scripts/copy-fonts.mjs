// Copia a Inter do @fontsource para public/fonts (roda no postinstall).
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
