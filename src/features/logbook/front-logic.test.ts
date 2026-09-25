import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanCard, formatHours, subjectLoad, timetableGrid } from "./front-logic.ts";

const slot = (day: number, start: string, end: string, subjectId: string) => ({ id: `${day}${start}`, day, start, end, classId: "c1", subjectId });

test("شبكة التوزيع الزمني حسب الفترة", () => {
  const slots = [slot(0, "08:00", "09:00", "ar"), slot(1, "08:00", "09:00", "math"), slot(0, "13:00", "14:00", "sci"), slot(2, "09:00", "10:00", "ar")];
  const am = timetableGrid(slots, "am");
  assert.deepEqual(am.ranges, [{ start: "08:00", end: "09:00" }, { start: "09:00", end: "10:00" }]);
  assert.equal(am.cell(1, am.ranges[0]!)[0]?.subjectId, "math");
  assert.equal(am.cell(3, am.ranges[0]!).length, 0);
  assert.equal(timetableGrid(slots, "pm").ranges.length, 1);
});

test("الحجم الساعي لكل مادة", () => {
  const load = subjectLoad([slot(0, "08:00", "09:00", "ar"), slot(1, "08:00", "08:45", "ar"), slot(2, "10:00", "10:30", "math")]);
  assert.deepEqual(load[0], { subjectId: "ar", sessions: 2, minutes: 105 });
  assert.equal(formatHours(105), "1:45");
});

test("تنظيف البطاقة", () => {
  const c = cleanCard({ phone: "  0555  12 34 56 ", birthDate: "12/03/1990" });
  assert.equal(c.phone, "0555 12 34 56");
  assert.equal(c.birthDate, "");
  assert.equal(c.address, "");
});
