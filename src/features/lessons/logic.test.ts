import { test } from "node:test";
import assert from "node:assert/strict";
import { groupCurriculum, lessonAccess, type CurriculumEntry } from "./logic.ts";

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
