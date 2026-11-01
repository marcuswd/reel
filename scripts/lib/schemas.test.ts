import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { z } from "zod";
import { brandSchema, jobSchema } from "../../src/core/schema.ts";

// os schemas versionados (autocomplete do job e da marca) não podem ficar para trás do zod: rode `pnpm video schemas`
const same = (file: string, schema: z.ZodType) => {
  const disk = JSON.parse(readFileSync(new URL(`../../schemas/${file}`, import.meta.url), "utf8"));
  assert.deepEqual(disk, JSON.parse(JSON.stringify(z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }))), `${file} desatualizado: rode pnpm video schemas`);
};

test("schemas/job.schema.json em dia com o zod", () => same("job.schema.json", jobSchema));
test("schemas/brand.schema.json em dia com o zod", () => same("brand.schema.json", brandSchema));
