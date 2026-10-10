import { test } from "node:test";
import assert from "node:assert/strict";
import { arabicWeek, cellItems, inferColumns, monthPublishedAt, monthWeeks, replaceCell, schoolMonths, yearWeeks } from "./monthly.ts";
import { rowsFromCurriculum, schoolWeekOf, type ProgressionRow } from "./logic.ts";
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

const e = (o: number, u: number, d: string, t: string, s = 1): CurriculumEntry => ({ id: `x${o}`, o, s, k: "week", u, a: "", d, t, b: false, sm: false });
const ar = {
  subject: "ar",
  weekMode: "absolute" as const,
  segments: [{ n: 1, title: "القيم الإنسانية" }],
  entries: [
    e(1, 3, "فهم المنطوق", "البائع الصغير"),
    e(2, 3, "التعبير الشفوي", "ظروف الزمان"),
    e(3, 3, "فهم المكتوب", "ماسح الزجاج"),
    e(4, 3, "فهم المكتوب", "ماسح الزجاج"), // حصتان لنفس النص
    e(5, 3, "فهم المكتوب", "الفعل الماضي"),
    e(6, 3, "التعبير الكتابي", "تعبير كتابي"),
    e(7, 5, "إدماج", "إدماج المقطع 1"),
  ],
};

test("التوزيع الرسمي: سطر لكل موضوع في أسبوعه، وللعربية خانة ميدانها", () => {
  const rows = rowsFromCurriculum(ar, 1);
  assert.deepEqual(rows.map((r) => [r.w, r.k, r.content]), [
    [3, "oral", "البائع الصغير"],
    [3, "oral", "ظروف الزمان"],
    [3, "reading", "ماسح الزجاج"],
    [3, "reading", "الفعل الماضي"],
    [3, "writing", "تعبير كتابي"],
    [5, "all", "إدماج المقطع 1"],
  ]);
  // المواد الأخرى بلا خانات
  assert.equal(rowsFromCurriculum({ ...ar, subject: "math" }, 1)[0]!.k, undefined);
});

test("خانات أسبوع العربية، والإدماج خانة واحدة على عرضها", () => {
  const rows = rowsFromCurriculum(ar, 1);
  assert.deepEqual(arabicWeek(rows, 3), {
    merged: null,
    cols: { oral: ["البائع الصغير", "ظروف الزمان"], reading: ["ماسح الزجاج", "الفعل الماضي"], writing: ["تعبير كتابي"] },
  });
  assert.deepEqual(arabicWeek(rows, 5).merged, ["إدماج المقطع 1"]);
  assert.deepEqual(arabicWeek(rows, 9), { merged: null, cols: { oral: [], reading: [], writing: [] } });
  // سطر بلا خانة (توزيع قديم أو ملصوق) يظهر في فهم المكتوب
  assert.deepEqual(cellItems([{ w: 2, unit: "", content: "نص", done: false }], 2, "reading"), ["نص"]);
});

test("تعديل خانة: الاستبدال في مكانها مع الإبقاء على «أُنجز»", () => {
  const rows = rowsFromCurriculum(ar, 1).map((r) => (r.content === "ماسح الزجاج" ? { ...r, done: true } : r));
  const next = replaceCell(rows, 3, "reading", ["ماسح الزجاج", "  الفعل   المضارع ", "", "ماسح الزجاج"]);
  assert.deepEqual(cellItems(next, 3, "reading"), ["ماسح الزجاج", "الفعل المضارع"]);
  assert.equal(next.find((r) => r.content === "ماسح الزجاج")!.done, true);
  assert.equal(next.find((r) => r.content === "الفعل المضارع")!.done, false);
  assert.equal(next.find((r) => r.content === "الفعل المضارع")!.unit, "القيم الإنسانية");
  // الخانات الأخرى لم تتغيّر، والترتيب محفوظ (الشفوي ثم المكتوب ثم الكتابي)
  assert.deepEqual(next.map((r) => r.k), ["oral", "oral", "reading", "reading", "writing", "all"]);
  // تفريغ خانة
  assert.deepEqual(cellItems(replaceCell(rows, 3, "writing", []), 3, "writing"), []);
});

test("نقل خانة إلى أسبوع آخر (تأجيل بعد الاختبارات)", () => {
  const rows: ProgressionRow[] = [
    { w: 11, unit: "م3", content: "الكسور (1)", done: false },
    { w: 12, unit: "م3", content: "التناسبية (1)", done: false },
    { w: 13, unit: "م4", content: "القسمة (1)", done: false },
  ];
  const next = replaceCell(rows, 12, null, cellItems(rows, 12, null), 13);
  assert.deepEqual(next.map((r) => [r.w, r.content]), [[11, "الكسور (1)"], [13, "القسمة (1)"], [13, "التناسبية (1)"]]);
  assert.equal(next[2]!.unit, "م3");
  // خانة فارغة تُملأ في أسبوع بلا أسطر
  const filled = replaceCell(rows, 20, null, ["الحصيلة"]);
  assert.deepEqual(filled.at(-1), { w: 20, unit: "م4", content: "الحصيلة", done: false });
});

test("توزيع عربية قديم بلا خانات: تُستردّ من السطر الرسمي المطابق", () => {
  const official = rowsFromCurriculum(ar, 1);
  const legacy = official.map((r) => {
    const c = { ...r };
    delete c.k;
    return c;
  });
  assert.deepEqual(inferColumns(legacy, official).map((r) => r.k), official.map((r) => r.k));
});

test("تاريخ وضع توزيع الشهر: صباح أوله بتوقيت الجزائر", () => {
  assert.equal(new Date(monthPublishedAt("2026-11")).toISOString(), "2026-11-01T07:00:00.000Z");
});
