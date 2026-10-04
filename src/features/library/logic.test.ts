import { test } from "node:test";
import assert from "node:assert/strict";
import { safeFileName, search, type IndexEntry } from "./logic.ts";

const e = (id: string, ar: string, fr: string, extra: Partial<IndexEntry> = {}): IndexEntry => ({
  id, t: { ar, fr }, l: "3AP", s: "fr", ty: "fiche", tm: 1, a: "free", lang: "fr", tags: [], u: "", pk: "", at: 1, ...extra,
});

const entries = [
  e("1", "مذكرة الألوان", "Fiche : les couleurs", { at: 5 }),
  e("2", "تقويم الفصل الأول", "Évaluation du 1er trimestre", { ty: "evaluation", a: "premium", at: 9 }),
  e("3", "المقطع الأول: العائلة", "Séquence 1 : la famille", { l: "4AP", tags: ["أسرة"], at: 3 }),
  e("4", "معلقة الحروف", "Affiche des lettres", { l: "", s: "", ty: "poster", at: 7 }),
];

test("بحث بلا همزات ولا «ال» ولا نبرات", () => {
  assert.deepEqual(search(entries, "الوان").map((x) => x.id), ["1"]);
  assert.deepEqual(search(entries, "evaluation").map((x) => x.id), ["2"]);
  assert.deepEqual(search(entries, "مذكره الالوان").map((x) => x.id), ["1"]);
  assert.deepEqual(search(entries, "اسره").map((x) => x.id), ["3"]);
  assert.deepEqual(search(entries, "couleurs زرقاء").map((x) => x.id), []);
});

test("التصفية: ما لا مستوى له يظهر في كل المستويات", () => {
  assert.deepEqual(search(entries, "", { level: "3AP" }).map((x) => x.id), ["2", "4", "1"]);
  assert.deepEqual(search(entries, "", { access: "premium" }).map((x) => x.id), ["2"]);
});

test("اسم ملف آمن", () => {
  assert.equal(safeFileName('مذكرة: "الألوان"/3.pdf'), "مذكرة الألوان 3.pdf");
});

test("فلترة حسب لغة المحتوى: الفرنسية وحدها والعربية وحدها", () => {
  const mixed = [
    e("fr1", "فرنسية", "Fiche", { lang: "fr" }),
    e("en1", "إنجليزية", "Unit", { lang: "en", s: "en" }),
    e("ar1", "كتابي", "Livre", { lang: "ar", s: "ar" }),
    e("gen", "توزيع عام", "Plan général", { lang: "ar", s: "" }),
    e("old", "قديم", "Ancien", { lang: "" }),
  ];
  assert.deepEqual(search(mixed, "", { lang: "fr" }).map((x) => x.id), ["fr1"]);
  assert.deepEqual(search(mixed, "", { lang: "en" }).map((x) => x.id), ["en1"]);
  assert.deepEqual(search(mixed, "", { lang: "ar" }).map((x) => x.id).sort(), ["ar1", "gen", "old"]);
  assert.equal(search(mixed, "").length, 5);
});
