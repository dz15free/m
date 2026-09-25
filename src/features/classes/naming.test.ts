import { test } from "node:test";
import assert from "node:assert/strict";
import { classDisplayName, compareClasses, nextSections } from "./naming.ts";

test("أول أفواج مستوى جديد تبدأ من 01", () => {
  assert.deepEqual(nextSections([], "3AP", 3), ["01", "02", "03"]);
});

test("الإضافة تكمل بعد أكبر رقم للمستوى نفسه فقط", () => {
  const existing = [
    { level: "3AP", section: "01" },
    { level: "3AP", section: "03" },
    { level: "4AP", section: "07" },
  ];
  assert.deepEqual(nextSections(existing, "3AP", 2), ["04", "05"]);
  assert.deepEqual(nextSections(existing, "5AP", 1), ["01"]);
});

test("الاسم المعروض والترتيب", () => {
  assert.equal(classDisplayName("3AP", "02"), "3AP-02");
  const order: Record<string, number> = { "3AP": 3, "4AP": 4 };
  const sorted = [
    { level: "4AP", section: "01" },
    { level: "3AP", section: "10" },
    { level: "3AP", section: "02" },
  ].sort(compareClasses((l) => order[l] ?? 99));
  assert.deepEqual(sorted.map((c) => classDisplayName(c.level, c.section)), ["3AP-02", "3AP-10", "4AP-01"]);
});
