import { test } from "node:test";
import assert from "node:assert/strict";
import { linkKind } from "./links.ts";

test("linkKind accepts internal paths and https only", () => {
  assert.equal(linkKind("/app/billing"), "internal");
  assert.equal(linkKind("https://example.com/x"), "external");
  assert.equal(linkKind("//evil.com"), null);
  assert.equal(linkKind("/\\evil.com"), null);
  assert.equal(linkKind("javascript:alert(1)"), null);
  assert.equal(linkKind("http://x.com"), null);
  assert.equal(linkKind(""), null);
});
