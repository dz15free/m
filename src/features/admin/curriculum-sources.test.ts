import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* curriculum-sources.json (قائمة الخادم) = مصادر Drive لمناهج CURRICULA في curriculum-catalog.ts */
test("curriculum-sources.json matches the sources of the published curricula", () => {
  const catalog = readFileSync(new URL("./curriculum-catalog.ts", import.meta.url), "utf8");
  const ids = new Set<string>();
  for (const [, path] of catalog.matchAll(/from "\.\.\/\.\.\/\.\.\/(content\/curriculum\/[^"]+\.json)"/g)) {
    const c = JSON.parse(readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8")) as { sources?: Record<string, { pdf?: string[]; images?: string[] }> };
    for (const s of Object.values(c.sources ?? {})) for (const id of [...(s.pdf ?? []), ...(s.images ?? [])]) ids.add(id);
  }
  const listed = JSON.parse(readFileSync(new URL("./curriculum-sources.json", import.meta.url), "utf8")) as string[];
  assert.deepEqual([...listed].sort(), [...ids].sort());
});
