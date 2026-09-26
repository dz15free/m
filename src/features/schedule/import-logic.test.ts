import { test } from "node:test";
import assert from "node:assert/strict";
import { matchClass, matchSubject, parseDay, parseSingleTime, parseTimeRange, parseTimetable, type ImportClass, type ImportSubject } from "./import-logic.ts";

const g = (rows: string[][]) => rows.map((r) => r.map((text) => ({ text })));
const SUBJECTS: ImportSubject[] = [
  { id: "ar", label: { ar: "اللغة العربية", fr: "Langue arabe" } },
  { id: "math", label: { ar: "الرياضيات", fr: "Mathématiques" } },
  { id: "islamic", label: { ar: "التربية الإسلامية", fr: "Éducation islamique" } },
  { id: "fr", label: { ar: "اللغة الفرنسية", fr: "Langue française" } },
  { id: "pe", label: { ar: "التربية البدنية", fr: "Éducation physique" } },
  { id: "science", label: { ar: "التربية العلمية والتكنولوجية", fr: "Éducation scientifique" } },
];

test("الأيام بالعربية والفرنسية", () => {
  assert.equal(parseDay("الأحد"), 0);
  assert.equal(parseDay("الإثنين"), 1);
  assert.equal(parseDay("الاثنين"), 1);
  assert.equal(parseDay("يوم الثلاثاء"), 2);
  assert.equal(parseDay("الأربعاء"), 3);
  assert.equal(parseDay("Jeudi"), 4);
  assert.equal(parseDay("رياضيات"), null);
});

test("المجالات الزمنية بصيغ مختلفة", () => {
  assert.deepEqual(parseTimeRange("08:00 - 09:00"), { start: "08:00", end: "09:00" });
  assert.deepEqual(parseTimeRange("8h-9h30"), { start: "08:00", end: "09:30" });
  assert.deepEqual(parseTimeRange("من 8 إلى 9"), { start: "08:00", end: "09:00" });
  assert.deepEqual(parseTimeRange("8سا00-9سا00"), { start: "08:00", end: "09:00" });
  assert.deepEqual(parseTimeRange("1-2"), { start: "13:00", end: "14:00" });
  assert.deepEqual(parseTimeRange("13:30 à 14:30"), { start: "13:30", end: "14:30" });
  assert.deepEqual(parseTimeRange("١٠:٠٠ - ١١:٠٠"), { start: "10:00", end: "11:00" });
  assert.equal(parseTimeRange("1AP-01"), null);
  assert.equal(parseSingleTime("08:00"), 480);
  assert.equal(parseSingleTime("Sat Dec 30 1899 10:00:00 GMT+0100"), 600);
});

test("المواد ومكوّناتها", () => {
  assert.equal(matchSubject("قراءة", SUBJECTS), "ar");
  assert.equal(matchSubject("تعبير شفوي", SUBJECTS), "ar");
  assert.equal(matchSubject("رياضيات", SUBJECTS), "math");
  assert.equal(matchSubject("ت. إسلامية", SUBJECTS), "islamic");
  assert.equal(matchSubject("تربية بدنية", SUBJECTS), "pe");
  assert.equal(matchSubject("Lecture", SUBJECTS), "fr");
  assert.equal(matchSubject("ت علمية", SUBJECTS), "science");
  assert.equal(matchSubject("؟؟", SUBJECTS), null);
});

const CLASSES: ImportClass[] = [
  { id: "c1", level: "1AM", section: "02", displayName: "1AM-02", subjectIds: ["math"] },
  { id: "c2", level: "3AM", section: "01", displayName: "3AM-01", subjectIds: ["math"] },
  { id: "c3", level: "1AM", section: "01", displayName: "1AM-01", subjectIds: ["math"] },
];

test("الأقسام بصيغها الشائعة", () => {
  assert.equal(matchClass("1م2", CLASSES), "c1");
  assert.equal(matchClass("1 م 2", CLASSES), "c1");
  assert.equal(matchClass("3 متوسط 1", CLASSES), "c2");
  assert.equal(matchClass("1AM-01", CLASSES), "c3");
  assert.equal(matchClass("رياضيات", CLASSES), null);
});

test("جدول معلّم ابتدائي: أيام في الأسطر، حصص مزدوجة تُدمج", () => {
  const res = parseTimetable(
    g([
      ["اليوم", "08:00-09:00", "09:00-10:00", "10:15-11:15", "13:00-14:00"],
      ["الأحد", "قراءة", "قراءة", "رياضيات", "ت. إسلامية"],
      ["الاثنين", "رياضيات", "تعبير", "", "تربية بدنية"],
      ["الثلاثاء", "فرنسية", "رياضيات", "راحة", ""],
    ]),
    { classes: [{ id: "k", level: "3AP", section: "01", displayName: "3AP-01", subjectIds: ["ar", "math", "islamic", "fr", "pe"] }], subjects: SUBJECTS },
  );
  assert.ok(res.ok);
  if (!res.ok) return;
  const sun = res.slots.filter((s) => s.day === 0).map((s) => `${s.start}-${s.end}:${s.subjectId}`);
  assert.deepEqual(sun, ["08:00-10:00:ar", "10:15-11:15:math", "13:00-14:00:islamic"]);
  assert.equal(res.slots.filter((s) => s.day === 2).length, 2);
  assert.ok(res.slots.every((s) => s.classId === "k" && s.status === "ok"));
});

test("جدول أستاذ مادة: أيام في الأعمدة، الخلية تذكر القسم فقط", () => {
  const res = parseTimetable(
    g([
      ["", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"],
      ["8-9", "1م2", "", "3م1", "", "1م1"],
      ["9-10", "1م2", "3م1", "", "", ""],
      ["10-11", "", "1م1", "", "نشاط", ""],
    ]),
    { classes: CLASSES, subjects: SUBJECTS },
  );
  assert.ok(res.ok);
  if (!res.ok) return;
  assert.equal(res.orientation, "daysInColumns");
  const sun = res.slots.filter((s) => s.day === 0);
  assert.deepEqual(sun.map((s) => `${s.start}-${s.end}:${s.classId}:${s.subjectId}`), ["08:00-10:00:c1:math"]);
  const unknown = res.slots.find((s) => s.raw === "نشاط");
  assert.equal(unknown?.status, "check");
});

test("بلا أيام أو بلا أوقات", () => {
  assert.deepEqual(parseTimetable(g([["a", "b"], ["c", "d"]]), { classes: CLASSES, subjects: SUBJECTS }), { ok: false, reason: "noDays" });
  assert.deepEqual(
    parseTimetable(g([["", "الأحد", "الإثنين", "الثلاثاء"], ["حصة", "x", "y", "z"]]), { classes: CLASSES, subjects: SUBJECTS }),
    { ok: false, reason: "noTimes" },
  );
});

test("المواد رغم أخطاء التعرّف", () => {
  assert.equal(matchSubject("رياضيت", SUBJECTS), "math");
  assert.equal(matchSubject("فرنسبة", SUBJECTS), "fr");
  assert.equal(matchSubject("قراعة", SUBJECTS), "ar");
});
