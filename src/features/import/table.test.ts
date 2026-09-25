import { test } from "node:test";
import assert from "node:assert/strict";
import { pasteToTable } from "./paste.ts";
import { detectHeader, parseTable, type Table } from "./table.ts";
import { reorderAll, summary, toReviewRows } from "./review.ts";

const t = (rows: string[][]): Table => rows.map((r) => r.map((text) => ({ text })));
const names = (rows: { last: string; first: string }[]) => rows.map((r) => `${r.last}/${r.first}`);

test("لصق من WhatsApp: ترقيم ورموز وأطر رسائل", () => {
  const text = `[24/09/2026, 08:15] الأستاذة: قائمة القسم
1- بن عمر ياسين
2- حمداني نور الهدى 👍
٣- بوجلال آية

4) خنان سعيد`;
  const { candidates } = parseTable(pasteToTable(text));
  assert.deepEqual(names(candidates), ["بن عمر/ياسين", "حمداني/نور الهدى", "بوجلال/آية", "خنان/سعيد"]);
  // الترقيم ليس «محارف غريبة»: كل الصفوف واضحة
  assert.deepEqual(toReviewRows(candidates, []).map((r) => r.status), ["ok", "ok", "ok", "ok"]);
});

test("عناوين القوائم الإدارية لا تُعدّ تلاميذ", () => {
  const { candidates } = parseTable(pasteToTable(
    "الجمهورية الجزائرية الديمقراطية الشعبية\nمديرية التربية لولاية وهران\nقائمة التلاميذ\nالسنة الدراسية 2026/2027\nبن عمر ياسين\nListe des élèves\nخنان سعيد",
  ));
  assert.deepEqual(names(candidates), ["بن عمر/ياسين", "خنان/سعيد"]);
});

test("لصق من Excel (Tab) بعناوين عربية: رقم | اللقب | الاسم | الجنس", () => {
  const text = "الرقم\tاللقب\tالاسم\tالجنس\n1\tبن عمر\tياسين\tذكر\n2\tحمداني\tنور الهدى\tأنثى\n";
  const res = parseTable(pasteToTable(text));
  assert.equal(res.headerRow, 0);
  assert.deepEqual(res.columns, ["number", "last", "first", "gender"]);
  assert.deepEqual(names(res.candidates), ["بن عمر/ياسين", "حمداني/نور الهدى"]);
  assert.deepEqual(res.candidates.map((c) => c.gender), ["M", "F"]);
});

test("عناوين فرنسية وعمود «Nom et prénom» واحد", () => {
  const res = parseTable(t([
    ["N°", "Nom et prénom", "Date de naissance"],
    ["1", "BENAMAR Yacine", "12/03/2018"],
    ["2", "HAMDANI Nour El Houda", "05/11/2017"],
  ]));
  assert.deepEqual(res.columns, ["number", "full", "birth"]);
  assert.deepEqual(names(res.candidates), ["BENAMAR/Yacine", "HAMDANI/Nour El Houda"]);
});

test("«الاسم» وحده دون «اللقب» يعني الاسم الكامل", () => {
  const h = detectHeader(t([["رقم", "الاسم"], ["1", "بن عمر ياسين"]]));
  assert.deepEqual(h?.columns, ["number", "full"]);
});

test("رقم التسجيل وتاريخ ومكان الميلاد لا يُخلطان بالأسماء", () => {
  const res = parseTable(t([
    ["رقم التسجيل", "اللقب والاسم", "تاريخ و مكان الميلاد"],
    ["20171234567", "بن عمر ياسين", "2017/05/02 وهران"],
  ]));
  assert.deepEqual(res.columns, ["id", "full", "birth"]);
  assert.deepEqual(names(res.candidates), ["بن عمر/ياسين"]);
});

test("جدول بلا عناوين: تصنيف الأعمدة بالمحتوى", () => {
  const res = parseTable(t([
    ["1", "بن عمر", "ياسين", "12/03/2018", "وهران"],
    ["2", "حمداني", "نور الهدى", "05/11/2017", "وهران"],
    ["3", "بوجلال", "آية", "01/01/2018", "عنابة"],
  ]));
  assert.deepEqual(res.columns, ["number", "last", "first", "birth", "ignore"]);
  assert.deepEqual(names(res.candidates), ["بن عمر/ياسين", "حمداني/نور الهدى", "بوجلال/آية"]);
});

test("عناوين مكررة في كل صفحة، وأسطر المجموع والتوقيع تُهمل", () => {
  const res = parseTable(t([
    ["الرقم", "اللقب والاسم"],
    ["1", "بن عمر ياسين"],
    ["الرقم", "اللقب والاسم"],
    ["2", "خنان سعيد"],
    ["", "المجموع: 2"],
    ["", "توقيع المدير"],
  ]));
  assert.deepEqual(names(res.candidates), ["بن عمر/ياسين", "خنان/سعيد"]);
});

test("قائمة تحوي عدة أقسام", () => {
  const res = parseTable(t([
    ["القسم: 3 ابتدائي 1"],
    ["1", "بن عمر ياسين"],
    ["القسم: 3 ابتدائي 2"],
    ["1", "خنان سعيد"],
  ]));
  assert.deepEqual(res.groups, ["القسم: 3 ابتدائي 1", "القسم: 3 ابتدائي 2"]);
  assert.deepEqual(res.candidates.map((c) => c.group), ["القسم: 3 ابتدائي 1", "القسم: 3 ابتدائي 2"]);
});

test("سطر واحد مفصول بفواصل عربية", () => {
  const { candidates } = parseTable(pasteToTable("بن عمر ياسين، حمداني نور الهدى، خنان سعيد"));
  assert.equal(candidates.length, 3);
});

test("المراجعة: الحالات، والتكرار، والموجودون في القسم", () => {
  const { candidates } = parseTable(t([
    ["بن عمر ياسين"],
    ["حمداني"],
    ["خ3نان سع#يد"],
    ["بن عمر ياسين"],
    ["بوجلال أية"],
  ]).map((r, i) => (i === 4 ? r : r)));
  candidates[0]!.conf = 92;
  const rows = toReviewRows(candidates, [{ id: "x", last: "بوجلال", first: "آية", gender: null }]);
  assert.deepEqual(rows.map((r) => r.status), ["ok", "check", "check", "check", "ok"]);
  assert.ok(rows[1]!.reasons.includes("missingFirst"));
  assert.ok(rows[2]!.reasons.includes("strangeChars"));
  assert.ok(rows[3]!.reasons.includes("duplicate"));
  assert.equal(rows[3]!.include, false, "التكرار الحرفي لا يُستورد مرتين");
  assert.ok(rows[4]!.reasons.includes("existsInClass"));
  assert.equal(rows[4]!.include, false);
  assert.equal(summary(rows).included, 3);
});

test("ثقة OCR منخفضة جدًا ⇒ 🔴 ولا يُستورد حتى يُصحَّح", () => {
  const { candidates } = parseTable([[{ text: "بن عمر ياسين", conf: 30 }]]);
  const [row] = toReviewRows(candidates, []);
  assert.equal(row!.status, "bad");
  assert.equal(row!.include, false);
});

test("عكس الترتيب يعيد تقسيم الأسماء المركّبة من النص الأصلي", () => {
  const { candidates } = parseTable(pasteToTable("نور الهدى حمداني\nياسين بن عمر"));
  const rows = toReviewRows(candidates, []);
  assert.deepEqual(names(rows), ["نور/الهدى حمداني", "ياسين/بن عمر"]);
  assert.deepEqual(names(reorderAll(rows, "firstLast")), ["حمداني/نور الهدى", "بن عمر/ياسين"]);
  assert.deepEqual(names(reorderAll(reorderAll(rows, "firstLast"), "lastFirst")), names(rows));
});

test("عنوان القائمة الذي يحوي «التلاميذ» ليس صف عناوين (ملف Excel حقيقي)", () => {
  const res = parseTable(t([
    ["الجمهورية الجزائرية الديمقراطية الشعبية", "", ""],
    ["قائمة التلاميذ - السنة الدراسية 2026/2027", "", ""],
    ["", "", ""],
    ["الرقم", "اللقب", "الاسم"],
    ["1", "بن عمر", "ياسين"],
    ["2", "آيت علي", "فاطمة الزهراء"],
  ]));
  assert.equal(res.headerRow, 3);
  assert.deepEqual(names(res.candidates), ["بن عمر/ياسين", "آيت علي/فاطمة الزهراء"]);
});
