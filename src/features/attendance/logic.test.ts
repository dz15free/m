import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attendanceRate,
  countMarks,
  nextStatus,
  pruneMap,
  sessionKey,
  setStatus,
  shiftDate,
  statsDelta,
  todayInAlgiers,
  totals,
} from "./logic.ts";

test("التدوير: حاضر ← غائب ← متأخر ← بعذر ← حاضر", () => {
  assert.equal(nextStatus("P"), "A");
  assert.equal(nextStatus("A"), "L");
  assert.equal(nextStatus("L"), "E");
  assert.equal(nextStatus("E"), "P");
});

test("الخريطة تحفظ الاستثناءات فقط", () => {
  let m = setStatus({}, "s1", "A");
  m = setStatus(m, "s2", "L");
  assert.deepEqual(m, { s1: "A", s2: "L" });
  m = setStatus(m, "s1", "P");
  assert.deepEqual(m, { s2: "L" });
});

test("العدّ للتلاميذ الحاليين فقط", () => {
  const map = { s1: "A", s2: "L", gone: "A" } as const;
  assert.deepEqual(countMarks(["s1", "s2", "s3", "s4"], map), { p: 2, a: 1, l: 1, e: 0 });
  assert.deepEqual(pruneMap(map, ["s1", "s2"]), { s1: "A", s2: "L" });
});

test("مفتاح الحصة والتواريخ", () => {
  assert.equal(sessionKey("2026-09-24", "c1", "am"), "2026-09-24_c1_am");
  assert.equal(shiftDate("2026-09-30", 1), "2026-10-01");
  assert.equal(shiftDate("2026-03-01", -1), "2026-02-28");
  // منتصف الليل بتوقيت غرينتش = الواحدة صباحًا في الجزائر
  assert.equal(todayInAlgiers(new Date("2026-09-24T23:30:00Z")), "2026-09-25");
});

test("فرق الإحصائيات: أول حفظ، ثم تعديل، ثم رجوع", () => {
  const first = statsDelta(null, { map: { s1: "A" }, rosterSize: 30 });
  assert.deepEqual(first, { students: { s1: { a: 1 } }, month: { sessions: 1, seats: 30, a: 1, l: 0, e: 0 } });

  // s1 صار متأخرًا، و s2 غائب
  const second = statsDelta({ map: { s1: "A" }, rosterSize: 30 }, { map: { s1: "L", s2: "A" }, rosterSize: 30 });
  assert.deepEqual(second, {
    students: { s1: { a: -1, l: 1 }, s2: { a: 1 } },
    month: { sessions: 0, seats: 0, a: 0, l: 1, e: 0 },
  });

  // لا تغيير ⇒ لا شيء يُكتب
  assert.deepEqual(statsDelta({ map: { s2: "A" }, rosterSize: 30 }, { map: { s2: "A" }, rosterSize: 30 }).students, {});
});

test("نسبة الحضور والمجاميع", () => {
  assert.equal(attendanceRate({ seats: 100, a: 4, e: 1 }), 0.95);
  assert.equal(attendanceRate({}), null);
  const t = totals({ sessions: 0, s: {}, m: { "2026-09": { sessions: 2, seats: 60, a: 3 }, "2026-10": { sessions: 1, seats: 30, e: 1, l: 2 } } });
  assert.deepEqual(t, { sessions: 3, seats: 90, a: 3, l: 2, e: 1 });
});
