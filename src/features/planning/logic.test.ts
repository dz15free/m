import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultStart, parseProgression, progressStatus, schoolWeekOf, weekStart } from "./logic.ts";

const days = [0, 1, 2, 3, 4];

test("بداية السنة والأسابيع الدراسية مع العطل", () => {
  assert.equal(defaultStart(2026), "2026-09-20"); // 21 سبتمبر 2026 يوم إثنين
  const start = "2026-09-20";
  const holidays = [{ start: "2026-10-25", end: "2026-10-31" }]; // أسبوع كامل عطلة
  assert.equal(schoolWeekOf("2026-09-15", start, days, holidays), 0);
  assert.equal(schoolWeekOf("2026-09-24", start, days, holidays), 1);
  assert.equal(schoolWeekOf("2026-10-22", start, days, holidays), 5);
  assert.equal(schoolWeekOf("2026-10-27", start, days, holidays), 5); // داخل العطلة
  assert.equal(schoolWeekOf("2026-11-02", start, days, holidays), 6);
  assert.equal(weekStart(6, start, days, holidays), "2026-11-01");
});

test("أين أنا الآن؟", () => {
  const rows = [1, 2, 3, 4].map((w) => ({ w, unit: "", content: `c${w}`, done: w <= 2 }));
  assert.equal(progressStatus(rows, 3).kind, "onTrack");
  assert.deepEqual([progressStatus(rows, 5).kind, progressStatus(rows, 5).weeks], ["late", 2]);
  assert.deepEqual([progressStatus(rows, 2).kind, progressStatus(rows, 2).weeks], ["ahead", 1]);
  assert.equal(progressStatus(rows.map((r) => ({ ...r, done: true })), 9).kind, "done");
  assert.equal(progressStatus([], 3).kind, "empty");
  assert.equal(progressStatus(rows, 5).nextRow?.content, "c3");
});

test("لصق توزيع جاهز", () => {
  const rows = parseProgression("الأسبوع 1: المقطع 1 | عائلتي\n2\tالمقطع 1\tفي البيت\nالمدرسة\n\nsemaine 5 - Séquence 2 | Les couleurs");
  assert.deepEqual(rows.map((r) => [r.w, r.unit, r.content]), [
    [1, "المقطع 1", "عائلتي"],
    [2, "المقطع 1", "في البيت"],
    [3, "", "المدرسة"],
    [5, "Séquence 2", "Les couleurs"],
  ]);
});
