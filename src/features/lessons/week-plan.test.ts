import { test } from "node:test";
import assert from "node:assert/strict";
import { arabicWeekPlan, arSessionOfLabel, mathWeekPlan, type PlanRef } from "./week-plan.ts";
import { memoMinutes, type CurriculumEntry } from "./logic.ts";

const e = (o: number, ss: string, t: string, u = 2): CurriculumEntry => ({ id: `ar${o}`, o, s: 1, k: "week", u, a: "لغة عربية", ss, d: "", t, b: false, sm: false });
const ar4 = {
  level: "4AP",
  subject: "ar",
  segments: [{ n: 1, title: "المقطع 1" }],
  entries: [
    e(1, "فهم المنطوق", "صديقتي حورية"),
    e(2, "فهم المكتوب (قراءة: أداء وفهم)", "مع عصاي في المدرسة"),
    e(3, "قراءة وتراكيب نحوية", "أنواع الكلمة"),
    e(4, "قراءة وصيغ صرفية / ظواهر إملائية", "الضمائر المنفصلة"),
    e(5, "المحفوظات", "الأمل الممكن"),
    e(6, "مطالعة وإنتاج كتابي", "تعبير كتابي"),
  ],
};
// جدول الصورة: الأحد 9:45 قراءة (1سا) و13:00 فهم المنطوق + التعبير الشفوي، الاثنين 8:00 قراءة نحو و9:45 الإنتاج الشفوي…
const ref = (key: string, date: string, start: string, minutes: number, label?: string): PlanRef => ({ key, date, start, minutes, label });
const week: PlanRef[] = [
  ref("sun1", "2026-10-04", "09:45", 60),
  ref("sun2", "2026-10-04", "13:00", 30),
  ref("sun3", "2026-10-04", "13:30", 30),
  ref("mon1", "2026-10-05", "08:00", 60),
  ref("mon2", "2026-10-05", "10:45", 30),
  ref("tue1", "2026-10-06", "09:45", 60),
  ref("wed1", "2026-10-07", "09:45", 30),
  ref("wed2", "2026-10-07", "10:15", 30),
  ref("thu1", "2026-10-08", "08:00", 60),
];

test("العربية: الحصص التسع حسب مدد الجدول", () => {
  const p = arabicWeekPlan(ar4, 2, week)!;
  assert.deepEqual(
    week.map((r) => p.get(r.key)!.map((x) => x.a)[0]),
    ["قراءة (أداء وفهم)", "فهم المنطوق", "تعبير شفهي", "قراءة + نحو", "إنتاج شفوي", "قراءة + صرف أو إملاء", "محفوظات", "مطالعة", "إنتاج كتابي"],
  );
  assert.equal(p.get("sun1")![0]!.id, "ar2");
  assert.equal(p.get("mon1")![0]!.t, "أنواع الكلمة");
  assert.equal(p.get("sun1")![0]!.ss, "قراءة (أداء وفهم) (1 سا)");
  assert.equal(memoMinutes(p.get("sun2")![0]!.ss), 30);
});

test("العربية: نص الخلية يحدد الحصة", () => {
  assert.equal(arSessionOfLabel("قراءة (الظاهرة الصرفية أو الإملائية) (1سا)"), 5);
  assert.equal(arSessionOfLabel("الإنتاج الشفوي (30)"), 3);
  assert.equal(arSessionOfLabel("التعبير الشفوي"), 2);
  assert.equal(arSessionOfLabel("قراءة أداء فهم"), 0);
  assert.equal(arSessionOfLabel("إنتاج كتابي (1سا)"), 8);
  const p = arabicWeekPlan(ar4, 2, [ref("a", "2026-10-04", "08:00", 60, "إنتاج كتابي"), ref("b", "2026-10-04", "09:00", 60)])!;
  assert.equal(p.get("a")![0]!.a, "إنتاج كتابي");
  assert.equal(p.get("b")![0]!.a, "قراءة (أداء وفهم)");
});

test("العربية: حصة ساعة ونصف = حصتان، والأسبوع غير العادي يبقى كما هو", () => {
  const p = arabicWeekPlan(ar4, 2, [ref("x", "2026-10-04", "08:00", 90)])!;
  assert.deepEqual(p.get("x")!.map((x) => x.ss), ["قراءة (أداء وفهم) (1 سا)", "فهم المنطوق (30 د)"]);
  assert.equal(arabicWeekPlan({ ...ar4, entries: [e(1, "إدماج", "إدماج")] }, 2, week), null);
  assert.equal(arabicWeekPlan({ ...ar4, level: "1AP" }, 2, week), null);
});

test("الرياضيات: الساعة درس، ونصف الساعة تدريب على آخر درس", () => {
  const m = (o: number, t: string): CurriculumEntry => ({ id: `m${o}`, o, s: 1, k: "week", u: 6, a: "رياضيات", ss: "رياضيات", d: "", t, b: false, sm: false });
  const cur = { level: "4AP", subject: "math", segments: [], entries: [m(1, "الضرب (1)"), m(2, "الضرب (2)"), m(3, "حل مشكلات")] };
  const slots = [ref("a", "2026-10-04", "08:00", 60), ref("b", "2026-10-04", "10:45", 30), ref("c", "2026-10-06", "08:00", 60), ref("d", "2026-10-07", "08:00", 60), ref("e", "2026-10-07", "09:45", 30)];
  const p = mathWeekPlan(cur, 6, slots)!;
  assert.deepEqual(slots.map((s) => `${p.get(s.key)![0]!.a}:${p.get(s.key)![0]!.id}`), ["رياضيات:m1", "تدريب وتطبيقات:m1", "رياضيات:m2", "رياضيات:m3", "تدريب وتطبيقات:m3"]);
  assert.equal(mathWeekPlan(cur, 6, slots.filter((s) => s.minutes === 60)), null);
});

test("memoMinutes: الساعات بالعربية", () => {
  assert.equal(memoMinutes("(1 سا)"), 60);
  assert.equal(memoMinutes("1 سا 30 د"), 90);
  assert.equal(memoMinutes("6سا و30د"), 390);
  assert.equal(memoMinutes("30 د"), 30);
});
