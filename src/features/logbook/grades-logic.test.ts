import { test } from "node:test";
import assert from "node:assert/strict";
import { annualAverage, cleanSheet, columnsOf, formatMark, generalAverage, parseMark, ranks, subjectAverage } from "./grades-logic.ts";

test("أعمدة المادة حسب المرحلة", () => {
  assert.deepEqual(columnsOf("ar", "primary"), ["ar_oral", "ar_reading", "ar_writing"]);
  assert.deepEqual(columnsOf("islamic", "primary"), ["islamic"]);
  assert.deepEqual(columnsOf("ar", "middle"), ["ar"]);
});

test("قراءة العلامة", () => {
  assert.equal(parseMark("7,5", 10), 7.5);
  assert.equal(parseMark(" 10 ", 10), 10);
  assert.equal(parseMark("", 10), null);
  assert.ok(Number.isNaN(parseMark("11", 10)));
  assert.ok(Number.isNaN(parseMark("abc", 10)));
  assert.equal(parseMark("15.25", 20), 15.25);
});

test("المعدلات والترتيب", () => {
  const m = { ar_oral: 8, ar_reading: 7, ar_writing: 6, math_numbers: 9, math_geometry: 7, islamic: 10 };
  assert.equal(subjectAverage(m, "ar", "primary"), 7);
  assert.equal(subjectAverage(m, "math", "primary"), 8);
  assert.equal(subjectAverage(m, "science", "primary"), null);
  assert.equal(generalAverage(m, ["ar", "math", "islamic", "science"], "primary"), 8.33);
  const r = ranks(new Map([["a", 7], ["b", 9], ["c", 7], ["d", null], ["e", 5]]));
  assert.deepEqual([r.get("b"), r.get("a"), r.get("c"), r.get("e"), r.get("d")], [1, 2, 2, 4, undefined]);
  assert.equal(annualAverage([7, null, 8]), 7.5);
});

test("تنظيف الكشف والعرض", () => {
  assert.deepEqual(cleanSheet({ s1: { ar_oral: 8, x: "9", y: 12 } }, 10), { s1: { ar_oral: 8 } });
  assert.equal(formatMark(7.5), "7.5");
  assert.equal(formatMark(8.33), "8.33");
  assert.equal(formatMark(8), "8");
});

test("الفصل الجاري", async () => {
  const { termOf } = await import("./grades-logic.ts");
  assert.deepEqual(["2026-09-25", "2027-01-10", "2027-05-02"].map(termOf), [1, 2, 3]);
});
