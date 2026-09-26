import { test } from "node:test";
import assert from "node:assert/strict";
import { impossibleArabicWord, listQuality, looksBroken } from "./quality.ts";

const table = (rows: string[][]) => rows.map((r) => r.map((text) => ({ text })));

test("الأسماء الحقيقية لا تُعدّ مستحيلة", () => {
  for (const w of ["طاهري", "عبدالرحمن", "الهدى", "مرام", "فاطمة", "إسلام", "الإمام", "قرنازي", "هدى", "مصطفى", "رؤوف", "هيئة", "ابراهيم", "بلقاسم", "لؤي", "سماء", "دعاء"]) {
    assert.equal(impossibleArabicWord(w), false, w);
  }
});

test("أنماط الترميز المشوّه تُكشف", () => {
  for (const w of ["الطصإ", "ةمحمد", "ىسين", "ئاب", "الب"]) assert.equal(impossibleArabicWord(w), true, w);
});

test("قائمة سليمة لا تُعدّ مشوّهة", () => {
  const t = table([["اللقب", "الاسم"], ["طاهري", "هدى"], ["قرنازي", "معاذ"], ["لغراب", "ناصر"], ["شلباب", "مرام"]]);
  const q = listQuality([t]);
  assert.equal(q.rows, 4);
  assert.equal(looksBroken(q), false);
});

test("أسماء مقطوعة (كلمة واحدة لكل صف) ومشوّهة ⇒ مشكوك فيها", () => {
  const t = table([["1", "الفعج"], ["2", "الطصإ"], ["3", "الفرسغ"], ["5", "حطئاب"], ["6", "ذاعري"]]);
  const q = listQuality([t]);
  assert.equal(looksBroken(q), true);
});

test("النتيجة الأفضل تحصل على نقاط أعلى", () => {
  const bad = listQuality([table([["1", "الفعج"], ["2", "الطصإ"]])]);
  const good = listQuality([table([["1", "طاهري", "هدى"], ["2", "قرنازي", "معاذ"]])]);
  assert.ok(good.score > bad.score);
});
