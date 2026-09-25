import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanCell, isRtl, keepNameChars, normalizeDigits, stripLinePrefix } from "./text.ts";
import { splitFullName } from "./split-name.ts";

test("الأرقام المشرقية والفارسية", () => {
  assert.equal(normalizeDigits("١٢٣ ۴۵"), "123 45");
});

test("تنظيف الخلايا: علامات الاتجاه والتطويل وأشكال العرض", () => {
  assert.equal(cleanCell("‏بـــن  عمر‎ "), "بن عمر");
  // أشكال العرض (Presentation Forms-B) كما تخرج من بعض ملفات PDF
  assert.equal(cleanCell("ﺑﻦ"), "بن");
});

test("إزالة بادئات الأسطر: ترقيم، نقاط، WhatsApp، رموز تعبيرية", () => {
  assert.equal(stripLinePrefix("1- بن عمر ياسين"), "بن عمر ياسين");
  assert.equal(stripLinePrefix("١٢. حمداني نور الهدى"), "حمداني نور الهدى");
  assert.equal(stripLinePrefix("(3) خنان سعيد"), "خنان سعيد");
  assert.equal(stripLinePrefix("• 04) بوجلال آية"), "بوجلال آية");
  assert.equal(stripLinePrefix("[24/09/2026, 08:15] كريم: بن عمر ياسين"), "بن عمر ياسين");
  assert.equal(stripLinePrefix("24/09/2026 08:15 - Karim: BENAMAR Yacine"), "BENAMAR Yacine");
  assert.equal(stripLinePrefix("✅ خنان سعيد 👍"), "خنان سعيد");
});

test("الأرقام المشرقية في الترقيم تُزال بعد توحيدها", () => {
  assert.equal(stripLinePrefix(normalizeDigits("١٢- حمداني نور الهدى")), "حمداني نور الهدى");
});

test("اتجاه النص وحروف الأسماء", () => {
  assert.ok(isRtl("بن عمر ياسين Y"));
  assert.ok(!isRtl("BENAMAR Yacine"));
  assert.equal(keepNameChars("بن عمر | ياسين 12"), "بن عمر ياسين");
  assert.equal(keepNameChars("Aït-Ali O'Neil"), "Aït-Ali O'Neil");
});

test("تقسيم الأسماء العربية: اللقب ثم الاسم", () => {
  const cases: [string, string, string][] = [
    ["حمداني نور الهدى", "حمداني", "نور الهدى"],
    ["بن عمر ياسين", "بن عمر", "ياسين"],
    ["بن عبد الله محمد الأمين", "بن عبد الله", "محمد الأمين"],
    ["آيت علي فاطمة الزهراء", "آيت علي", "فاطمة الزهراء"],
    ["بو جلال آية", "بو جلال", "آية"],
    ["بوجلال آية", "بوجلال", "آية"],
    ["أولاد سيدي الشيخ أحمد", "أولاد سيدي", "الشيخ أحمد"],
    ["خنان سعيد", "خنان", "سعيد"],
    ["عبد القادر عمر", "عبد القادر", "عمر"],
  ];
  for (const [full, last, first] of cases) {
    assert.deepEqual(splitFullName(full, "lastFirst"), { last, first }, full);
  }
});

test("تقسيم الأسماء العربية: الاسم ثم اللقب", () => {
  assert.deepEqual(splitFullName("نور الهدى حمداني", "firstLast"), { first: "نور الهدى", last: "حمداني" });
  assert.deepEqual(splitFullName("عبد الرحمن بن عمر", "firstLast"), { first: "عبد الرحمن", last: "بن عمر" });
  assert.deepEqual(splitFullName("ياسين بن عمر", "firstLast"), { first: "ياسين", last: "بن عمر" });
});

test("القوائم الفرنسية: اللقب بحروف كبيرة أينما كان", () => {
  assert.deepEqual(splitFullName("BENAMAR Yacine"), { last: "BENAMAR", first: "Yacine" });
  assert.deepEqual(splitFullName("Nour El Houda HAMDANI"), { last: "HAMDANI", first: "Nour El Houda" });
  assert.deepEqual(splitFullName("AIT ALI Fatima Zohra"), { last: "AIT ALI", first: "Fatima Zohra" });
  assert.deepEqual(splitFullName("Ben Amar Yacine"), { last: "Ben Amar", first: "Yacine" });
});

test("كلمة واحدة تُعتبر لقبًا", () => {
  assert.deepEqual(splitFullName("ياسين"), { last: "ياسين", first: "" });
});
