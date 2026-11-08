import { test } from "node:test";
import assert from "node:assert/strict";
import { linkKind, splitLinks } from "./links.ts";

test("linkKind accepts internal paths and https only", () => {
  assert.equal(linkKind("/app/billing"), "internal");
  assert.equal(linkKind("https://example.com/x"), "external");
  assert.equal(linkKind("//evil.com"), null);
  assert.equal(linkKind("/\\evil.com"), null);
  assert.equal(linkKind("javascript:alert(1)"), null);
  assert.equal(linkKind("http://x.com"), null);
  assert.equal(linkKind(""), null);
});

test("finds links in Arabic and Latin text without trailing punctuation", () => {
  const parts = splitLinks("زوروا https://www.facebook.com/profile.php?id=615، أو www.example.com. شكرًا");
  const links = parts.filter((p) => p.href);
  assert.deepEqual(links.map((p) => p.href), ["https://www.facebook.com/profile.php?id=615", "https://www.example.com"]);
  assert.equal(parts.map((p) => p.t).join(""), "زوروا https://www.facebook.com/profile.php?id=615، أو www.example.com. شكرًا");
  assert.deepEqual(splitLinks("بلا روابط"), [{ t: "بلا روابط" }]);
});
