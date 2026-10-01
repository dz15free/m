import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALLOWED_MIME, CONTENT_TYPES } from "./logic.ts";
import { pendingCatalog, toContentDoc, type CatalogEntry } from "./catalog.ts";

const catalog = JSON.parse(readFileSync(new URL("./catalog.json", import.meta.url), "utf8")) as CatalogEntry[];

test("catalog entries satisfy the content rules", () => {
  const ids = new Set<string>();
  for (const e of catalog) {
    assert.match(e.id, /^cat-[a-z0-9-]{1,60}$/, e.id);
    assert.ok(!ids.has(e.id), `duplicate ${e.id}`);
    ids.add(e.id);
    assert.ok((CONTENT_TYPES as readonly string[]).includes(e.type), e.type);
    assert.ok(e.title.ar.length > 0 && e.title.ar.length <= 200 && e.title.fr.length <= 200, e.id);
    assert.ok(e.files.length >= 1 && e.files.length <= 10, e.id);
    assert.ok(e.tags.length <= 20 && e.excerpt.length <= 1000 && e.unit.length <= 120, e.id);
    for (const f of e.files) {
      assert.ok((ALLOWED_MIME as readonly string[]).includes(f.mime), `${e.id}: ${f.mime}`);
      assert.match(f.driveId, /^[A-Za-z0-9_-]{20,}$/);
      assert.ok((f.size ?? 0) <= 100 * 1024 * 1024, `${e.id}: too large`);
    }
  }
});

test("pending entries skip what is already imported", () => {
  const first = catalog[0]!;
  assert.equal(pendingCatalog(catalog, new Set([first.id])).length, catalog.length - 1);
  const doc = toContentDoc(first, []);
  assert.equal(doc.status, "published");
  assert.equal(doc.stage, "primary");
});
