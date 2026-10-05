import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanTitle, driveContentId, guessMeta } from "./drive-guess.ts";

const f = (path: string, mime = "application/pdf") => ({ id: "1AbCdEfGhIjKlMnOpQrStUvWxYz", name: path.split("/").pop()!, path, mime, size: 1000 });

test("يصنّف الملفات من أسمائها", () => {
  const a = guessMeta(f("مذكرات التربية العلمية سنة ثانية (2).pdf"));
  assert.equal(a.level, "2AP");
  assert.equal(a.subject, "science");
  assert.equal(a.type, "fiche");
  assert.equal(a.title, "مذكرات التربية العلمية سنة ثانية");
  const b = guessMeta(f("Français/Fiches_5AP_Projet1_Au_zoo.pdf"));
  assert.equal(b.level, "5AP");
  assert.equal(b.subject, "fr");
  assert.equal(b.language, "fr");
  const c = guessMeta(f("المخطط السنوي س1.pdf"));
  assert.deepEqual([c.level, c.type], ["1AP", "progression"]);
  const d = guessMeta(f("معلقات السنة الثانية.pdf"));
  assert.deepEqual([d.level, d.type], ["2AP", "poster"]);
  const e = guessMeta(f("01- السنة الأولى الكتاب المدرسي دفتر الأنشطة رياضيات، علمية.pdf"));
  assert.deepEqual([e.level, e.type], ["1AP", "textbook"]);
  assert.equal(guessMeta(f("صورة.jpg", "image/jpeg")).type, "image");
});

test("عنوان نظيف ومعرّف ثابت", () => {
  assert.equal(cleanTitle("مذكرات-الاسبوع-3_المقطع 2 موقع راية التعليم5.pdf"), "مذكرات الاسبوع 3 المقطع 2");
  assert.equal(driveContentId("abc"), "drv-abc");
});

test("ملفات التحضيري", () => {
  assert.equal(guessMeta(f("التحضيري/00- التحضيري رياضيات.pdf")).level, "PRE");
  assert.equal(guessMeta(f("التحضيري/00- التحضيري عربية.pdf")).subject, "ar");
});
