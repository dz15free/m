import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attendancePart,
  copyDay,
  currentAndNext,
  DEFAULT_CALENDAR,
  isSchoolDay,
  nowMinutesInAlgiers,
  overlaps,
  slotsForDate,
  toMinutes,
  weekdayOf,
  type Calendar,
  type Slot,
} from "./logic.ts";

const slot = (id: string, day: number, start: string, end: string, classId = "c1", subjectId = "fr"): Slot => ({
  id, day, start, end, classId, subjectId,
});

// 2026-09-27 = الأحد
const SUNDAY = "2026-09-27";

test("أيام الأسبوع والأيام الدراسية الجزائرية", () => {
  assert.equal(weekdayOf(SUNDAY), 0);
  assert.equal(weekdayOf("2026-10-01"), 4); // الخميس
  assert.ok(isSchoolDay(DEFAULT_CALENDAR, SUNDAY));
  assert.ok(!isSchoolDay(DEFAULT_CALENDAR, "2026-10-02")); // الجمعة
  assert.ok(!isSchoolDay(DEFAULT_CALENDAR, "2026-10-03")); // السبت
});

test("العطل تلغي حصص اليوم", () => {
  const cal: Calendar = { schoolDays: [0, 1, 2, 3, 4], holidays: [{ start: "2026-10-25", end: "2026-11-01" }] };
  const slots = [slot("a", 0, "08:00", "09:00")];
  assert.equal(slotsForDate(slots, cal, "2026-10-25").length, 0);
  assert.equal(slotsForDate(slots, cal, "2026-11-08").length, 1);
});

test("حصص اليوم مرتبة بالوقت، والحصة الجارية والتالية", () => {
  const slots = [slot("b", 0, "10:00", "11:00", "c2"), slot("a", 0, "08:00", "09:00"), slot("x", 1, "08:00", "09:00")];
  const day = slotsForDate(slots, DEFAULT_CALENDAR, SUNDAY);
  assert.deepEqual(day.map((s) => s.id), ["a", "b"]);
  assert.deepEqual(currentAndNext(day, toMinutes("08:30")), { current: day[0], next: day[1] });
  assert.deepEqual(currentAndNext(day, toMinutes("09:30")), { current: null, next: day[1] });
  assert.deepEqual(currentAndNext(day, toMinutes("12:00")), { current: null, next: null });
});

test("جزء الحضور: نصف يوم لمعلّم القسم، مادة لأستاذ المادة", () => {
  assert.equal(attendancePart(slot("a", 0, "08:00", "09:00"), true), "am");
  assert.equal(attendancePart(slot("a", 0, "13:30", "14:30"), true), "pm");
  assert.equal(attendancePart(slot("a", 0, "13:30", "14:30", "c1", "math"), false), "math");
});

test("التداخل ونسخ يوم", () => {
  assert.ok(overlaps(slot("a", 0, "08:00", "09:00"), slot("b", 0, "08:30", "09:30")));
  assert.ok(!overlaps(slot("a", 0, "08:00", "09:00"), slot("b", 0, "09:00", "10:00")));
  assert.ok(!overlaps(slot("a", 0, "08:00", "09:00"), slot("b", 1, "08:00", "09:00")));
  const copied = copyDay([slot("a", 0, "08:00", "09:00"), slot("z", 2, "10:00", "11:00")], 0, 2);
  assert.equal(copied.filter((s) => s.day === 2).length, 1, "نسخ يستبدل حصص اليوم الهدف");
  assert.notEqual(copied.find((s) => s.day === 2)!.id, "a");
});

test("الدقيقة الحالية بتوقيت الجزائر (UTC+1)", () => {
  assert.equal(nowMinutesInAlgiers(new Date("2026-09-27T07:15:00Z")), 8 * 60 + 15);
});
