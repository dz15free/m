import { test } from "node:test";
import assert from "node:assert/strict";
import { WILAYAS, wilayaLabel } from "./wilayas.ts";

test("69 ولاية برموز متتالية من 1 إلى 69 دون تكرار", () => {
  assert.equal(WILAYAS.length, 69);
  WILAYAS.forEach((w, i) => assert.equal(w.code, i + 1));
  assert.equal(new Set(WILAYAS.map((w) => w.ar)).size, 69);
});

test("التسمية المعروضة", () => {
  assert.equal(wilayaLabel(1, "ar"), "01 — أدرار");
  assert.equal(wilayaLabel(69, "fr"), "69 — El Abiodh Sidi Cheikh");
});
