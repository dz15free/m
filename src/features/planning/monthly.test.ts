import { test } from "node:test";
import assert from "node:assert/strict";
import { arabicColumns, entriesOfWeek, monthPublishedAt, monthWeeks, schoolMonths, topicsOf, yearWeeks } from "./monthly.ts";
import { schoolWeekOf } from "./logic.ts";
import { officialCalendar } from "../../shared/dz/school-calendar.ts";
import type { CurriculumEntry } from "../lessons/logic.ts";

const official = officialCalendar("2026-2027")!;
const cal = { schoolDays: [0, 1, 2, 3, 4], ...official };
const START = "2026-09-20";

test("رزنامة 2026-2027: العطل بالأيام المعطّلة فعلًا", () => {
  // من مساء الثلاثاء 27 أكتوبر إلى صباح الاثنين 2 نوفمبر
  assert.deepEqual(official.holidays.map((h) => [h.start, h.end]), [
    ["2026-10-28", "2026-11-01"],
    ["2026-12-18", "2027-01-02"],
    ["2027-03-19", "2027-04-03"],
  ]);
  assert.deepEqual(official.exams.map((e) => e.days.length), [5, 5, 5]);
});

test("أسابيع أكتوبر 2026: الأسابيع الدراسية 3 إلى 6، والأخير تقطعه عطلة الخريف", () => {
  const weeks = monthWeeks("2026-10", START, cal);
  assert.deepEqual(weeks.map((w) => w.n), [3, 4, 5, 6]);
  assert.deepEqual(weeks.map((w) => w.index), [1, 2, 3, 4]);
  assert.deepEqual(weeks[3]!.days, ["2026-10-25", "2026-10-26", "2026-10-27"]);
  assert.equal(weeks[3]!.holidays[0]!.label?.ar, "عطلة الخريف");
  // أسبوع 27 سبتمبر: أربعة أيام في سبتمبر ⇐ سبتمبر
  assert.deepEqual(monthWeeks("2026-09", START, cal).map((w) => w.n), [1, 2]);
});

test("نفس ترقيم «أين أنا الآن؟» والدفتر اليومي، وأسابيع العطلة الكاملة لا تُعدّ", () => {
  for (const w of yearWeeks(START, cal)) {
    assert.equal(schoolWeekOf(w.days[0]!, START, cal.schoolDays, cal.holidays), w.n);
  }
  // ديسمبر: أسبوع 29 نوفمبر (3 أيام في ديسمبر)، ثم اختبارات الفصل الأول في الأسبوع 12، ثم الأسبوع 13 حتى 17 ديسمبر
  const dec = monthWeeks("2026-12", START, cal);
  assert.deepEqual(dec.map((w) => w.n), [11, 12, 13]);
  assert.equal(dec[1]!.exams[0]!.term, 1);
  assert.equal(dec[1]!.exams[0]!.days.length, 5);
  // جانفي يبدأ بالأسبوع 14 (أسبوعا العطلة لا يُعدّان)
  assert.equal(monthWeeks("2027-01", START, cal)[0]!.n, 14);
  // مارس: اختبارات الفصل الثاني موزعة على أسبوعين
  const mar = monthWeeks("2027-03", START, cal);
  assert.deepEqual(mar.filter((w) => w.exams.length).map((w) => w.exams[0]!.days.length), [3, 2]);
});

test("أشهر السنة الدراسية حتى شهر آخر اختبار", () => {
  assert.deepEqual(schoolMonths(START, cal), ["2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05"]);
  // بلا رزنامة: حتى جوان
  assert.equal(schoolMonths(START, { schoolDays: [0, 1, 2, 3, 4], holidays: [] }).at(-1), "2027-06");
});

const e = (o: number, u: number, d: string, t: string): CurriculumEntry => ({ id: `x${o}`, o, s: 1, k: "week", u, a: "", d, t, b: false, sm: false });

test("حصص الأسبوع والمواضيع بلا تكرار", () => {
  const c = { weekMode: "absolute" as const, entries: [e(1, 3, "فهم المكتوب", "ماسح الزجاج"), e(2, 3, "فهم المكتوب", "ماسح الزجاج"), e(3, 4, "فهم المكتوب", "جدي")] };
  assert.deepEqual(topicsOf(entriesOfWeek(c, 3)), ["ماسح الزجاج"]);
  assert.deepEqual(entriesOfWeek(c, 12), []);
  assert.deepEqual(entriesOfWeek(null, 3), []);
});

test("العربية بميادينها، والإدماج خانة واحدة", () => {
  const week = [
    e(1, 3, "فهم المنطوق", "البائع الصغير"),
    e(2, 3, "التعبير الشفوي", "ظروف الزمان"),
    e(3, 3, "فهم المكتوب", "ماسح الزجاج"),
    e(4, 3, "فهم المكتوب", "الفعل الماضي"),
    e(5, 3, "التعبير الكتابي", "تعبير كتابي"),
  ];
  const r = arabicColumns(week);
  assert.equal(r.merged, null);
  assert.deepEqual(r.cols, { oral: ["البائع الصغير", "ظروف الزمان"], reading: ["ماسح الزجاج", "الفعل الماضي"], writing: ["تعبير كتابي"] });
  assert.deepEqual(arabicColumns([e(1, 5, "إدماج", "إدماج المقطع 1")]).merged, ["إدماج المقطع 1"]);
  assert.equal(arabicColumns([]).merged, null);
});

test("تاريخ وضع توزيع الشهر: صباح أوله بتوقيت الجزائر", () => {
  assert.equal(new Date(monthPublishedAt("2026-11")).toISOString(), "2026-11-01T07:00:00.000Z");
});
