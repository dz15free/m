import { test } from "node:test";
import assert from "node:assert/strict";
import { weeksOf, curriculumWeeks, groupCurriculum, lessonAccess, packWeek, suggestForWeek, type CurriculumEntry } from "./logic.ts";

const e = (o: number, s: number, k: "week" | "day", u: number): CurriculumEntry => ({ id: `x_${o}`, o, s, k, u, a: "", d: "", t: `t${o}`, b: true, sm: false });

test("التجميع: مقطع ثم أسبوع، بترتيب الوثيقة حتى لو جاءت الأسابيع مبعثرة", () => {
  const g = groupCurriculum({
    segments: [{ n: 1, title: "عائلتي" }, { n: 8, title: "الموروث الحضاري" }],
    entries: [e(3, 8, "week", 2), e(1, 1, "day", 1), e(2, 1, "day", 2), e(4, 8, "week", 1), e(5, 8, "week", 1)],
  });
  assert.deepEqual(g.map((s) => s.n), [1, 8]);
  assert.equal(g[0]!.title, "عائلتي");
  assert.deepEqual(g[1]!.units.map((u) => [u.n, u.entries.map((x) => x.o)]), [[1, [4, 5]], [2, [3]]]);
});

test("الوصول: المشترك كل شيء، التجربة الملخّص والنماذج، والمقفل لا شيء", () => {
  assert.deepEqual(lessonAccess("full", false), { summary: true, body: true });
  assert.deepEqual(lessonAccess("trial", false), { summary: true, body: false });
  assert.deepEqual(lessonAccess("trial", true), { summary: true, body: true });
  assert.deepEqual(lessonAccess("locked", true), { summary: false, body: false });
  assert.deepEqual(lessonAccess("locked", false, true), { summary: true, body: true });
});

test("أسابيع المنهاج: الأيام خمسة خمسة ثم أسابيع المقاطع", () => {
  const entries = [...Array.from({ length: 10 }, (_, i) => e(i + 1, 1, "day", i + 1)), e(11, 2, "week", 1), e(12, 2, "week", 1), e(13, 2, "week", 2)];
  const w = curriculumWeeks(entries);
  assert.deepEqual(w.map((x) => [x.kind, x.entries.map((y) => y.o)]), [["day", [1, 2, 3, 4, 5]], ["day", [6, 7, 8, 9, 10]], ["week", [11, 12]], ["week", [13]]]);
});

test("الاقتراح: حصص الأسبوع بترتيبها، وأيام التمهيدية حسب اليوم", () => {
  const entries = [...Array.from({ length: 5 }, (_, i) => e(i + 1, 1, "day", i + 1)), e(6, 2, "week", 1), e(7, 2, "week", 1)];
  const w = curriculumWeeks(entries);
  // 2026-10-04 أحد، 2026-10-05 إثنين
  const prep = suggestForWeek(w, 1, [{ key: "a", date: "2026-10-05", start: "08:00" }, { key: "b", date: "2026-10-04", start: "09:00" }], [0, 1, 2, 3, 4]);
  assert.deepEqual([prep.get("a")?.o, prep.get("b")?.o], [2, 1]);
  const wk = suggestForWeek(w, 2, [{ key: "x", date: "2026-10-12", start: "10:00" }, { key: "y", date: "2026-10-11", start: "08:00" }, { key: "z", date: "2026-10-13", start: "08:00" }], [0, 1, 2, 3, 4]);
  assert.deepEqual([wk.get("y")?.o, wk.get("x")?.o, wk.get("z")], [6, 7, undefined]);
  assert.equal(suggestForWeek(w, 9, [{ key: "q", date: "2026-10-12", start: "10:00" }], [0, 1, 2, 3, 4]).size, 0);
});

test("الأسابيع المطلقة: الأسبوع n هو أسبوع السنة n حتى مع أسابيع فارغة", () => {
  const w = weeksOf({ weekMode: "absolute", entries: [e(1, 1, "week", 1), e(2, 1, "week", 3), e(3, 2, "week", 3)] });
  assert.deepEqual(w.map((x) => x.entries.map((y) => y.o)), [[1], [], [2, 3]]);
});

test("حصة ساعة تأخذ نشاطين من 30 دقيقة حسب مدد المذكرات", () => {
  const e = (id: string, ss: string): CurriculumEntry => ({ id, o: 0, s: 1, k: "week", u: 2, a: "Français", ss, d: "", t: id, b: false, sm: false });
  const entries = [e("voc", "Vocabulaire (30 mn)"), e("lec", "Lecture (30 mn)"), e("gra", "Grammaire (45 mn)"), e("ort", "Orthographe (15 mn)"), e("prod", "Production (60 mn)")];
  const slots = [
    { key: "s1", date: "2026-10-11", start: "08:00", minutes: 60 },
    { key: "s2", date: "2026-10-12", start: "08:00", minutes: 60 },
    { key: "s3", date: "2026-10-13", start: "08:00", minutes: 45 },
  ];
  const out = packWeek(entries, slots);
  assert.deepEqual(out.get("s1")!.map((x) => x.id), ["voc", "lec"]);
  assert.deepEqual(out.get("s2")!.map((x) => x.id), ["gra", "ort"]);
  assert.deepEqual(out.get("s3")!.map((x) => x.id), ["prod"]);
  // بلا مدد: حصة لحصة
  const plain = packWeek([e("a", "Séance 1"), e("b", "Séance 2")], slots.slice(0, 2));
  assert.deepEqual([...plain.values()].map((p) => p.map((x) => x.id)), [["a"], ["b"]]);
});
