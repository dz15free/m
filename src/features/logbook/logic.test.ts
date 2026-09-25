import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanLesson, emptyLesson, isBlank, lessonKey, weekDates } from "./logic.ts";

test("مفتاح حصة الدفتر", () => {
  assert.equal(lessonKey("2026-09-27", "c1", "ar", "08:00"), "2026-09-27_c1_ar_0800");
});

test("سطر فارغ وتنظيف الحقول", () => {
  const l = emptyLesson({ date: "2026-09-27", classId: "c1", subjectId: "ar", start: "08:00", end: "09:00" });
  assert.ok(isBlank(l));
  const c = cleanLesson({ ...l, title: "  قراءة   :  في المدرسة  ", notes: "x".repeat(500) });
  assert.equal(c.title, "قراءة : في المدرسة");
  assert.equal(c.notes.length, 400);
  assert.ok(!isBlank(c));
});

test("أيام الأسبوع الدراسي (الأحد–الخميس) لأي يوم منه", () => {
  const days = [0, 1, 2, 3, 4];
  assert.deepEqual(weekDates("2026-09-30", days), ["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01"]);
  assert.deepEqual(weekDates("2026-09-27", days)[0], "2026-09-27");
});
