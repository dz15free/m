import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { REPO_CURRICULA } from "./curriculum-ids.ts";

test("REPO_CURRICULA lists every curriculum file", () => {
  const files = readdirSync(new URL("../../../content/curriculum", import.meta.url)).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")).sort();
  assert.deepEqual([...REPO_CURRICULA].sort(), files);
});
