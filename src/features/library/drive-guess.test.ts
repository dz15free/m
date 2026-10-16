import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanTitle, driveContentId, driveToContentDoc, guessMeta, guessStage } from "./drive-guess.ts";

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

test("دروس الإنجليزية 3PS ليست فرنسية", () => {
  const g = guessMeta(f("English/3PS_Sequence1_Me_my_family_and_my_friends_Lesson_Plans.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
  assert.equal(g.subject, "en");
  assert.equal(g.level, "3AP");
});

test("ملفات المتوسط والثانوي: الطور والمستوى والمادة", () => {
  const a = f("المتوسط/مذكرات العلوم الفيزيائية السنة الرابعة متوسط.pdf");
  assert.equal(guessStage(a), "middle");
  assert.deepEqual([guessMeta(a).level, guessMeta(a).subject], ["4AM", "physics"]);
  const b = f("Fiches 3AM projet 2.pdf");
  assert.equal(guessStage(b), "middle");
  assert.deepEqual([guessMeta(b).level, guessMeta(b).subject, guessMeta(b).language], ["3AM", "fr", "fr"]);
  const c = f("الثانوي/دروس الفلسفة 3 ثانوي.pdf");
  assert.equal(guessStage(c), "secondary");
  assert.deepEqual([guessMeta(c).level, guessMeta(c).subject], ["3AS", "philosophy"]);
  const d = f("الثانوي/السنة الأولى/التاريخ والجغرافيا.pdf");
  assert.deepEqual([guessMeta(d).level, guessMeta(d).subject], ["1AS", "histgeo"]);
  assert.equal(guessMeta(f("مذكرات 2م رياضيات.pdf"), "middle").level, "2AM");
  assert.equal(guessMeta(f("1AS english.pdf")).subject, "en");
  // ملف لا يدل على طور: ابتدائي كما كان
  assert.equal(guessStage(f("مذكرات التربية العلمية سنة ثانية.pdf")), "primary");
  // الطور الذي يختاره الأدمن يغلب
  assert.equal(guessMeta(f("مذكرات السنة الثانية رياضيات.pdf"), "middle").level, "2AM");
});

test("المحتوى المستورد يحمل الطور", () => {
  const file = { key: "k", name: "a.pdf", mime: "application/pdf", size: 1 };
  assert.equal(driveToContentDoc(f("رياضيات 1AM.pdf"), file).stage, "middle");
  assert.equal(driveToContentDoc(f("رياضيات.pdf"), file, "secondary").stage, "secondary");
});
