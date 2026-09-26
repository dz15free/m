import { test } from "node:test";
import assert from "node:assert/strict";
import { groupFromTitle, reconstructTable } from "./grid.ts";
import { parseTable } from "./table.ts";
import { fixLigatures } from "./pdf-text.ts";

// كلمة بمستطيل: x من اليمين (RTL)، y أعلى السطر، ارتفاع 10
const w = (text: string, xRight: number, y: number, width = text.length * 5) => ({ text, box: { x0: xRight - width, x1: xRight, y0: y, y1: y + 10 } });

test("قائمة رسمية: عناوين على 3 أسطر، خلايا متعددة الأسطر، صف لكل رقم ترتيب", () => {
  const pieces = [
    w("قائمة التلاميذ للسنة :خامسة ابتدائي 01 للسنة الدراسية :2026 - 2027", 500, 10, 300),
    // العناوين: «رقم / الترتيب»… «تاريخ / الميلاد»
    w("الترتيب", 560, 60), w("اللقب", 440, 60), w("الاسم", 340, 60), w("الجنس", 250, 60), w("تاريخ", 180, 54), w("الميلاد", 180, 66),
    // صف 1 عادي
    w("1", 555, 100), w("بن", 470, 100), w("عمر", 450, 100), w("ياسين", 380, 100), w("ذكر", 245, 100), w("2015-", 185, 93), w("07-13", 185, 107),
    // صف 2: الاسم على سطرين فوق وتحت رقم الترتيب
    w("2", 555, 131), w("طاهري", 470, 131), w("نور", 380, 124), w("الهدى", 380, 138), w("أنثى", 245, 131), w("2016-", 185, 124), w("09-30", 185, 138),
    // صف 3
    w("3", 555, 162), w("قرنازي", 470, 162), w("سيف", 380, 155), w("الدين", 380, 169), w("ذكر", 245, 162), w("2015-", 185, 155), w("02-04", 185, 169),
    w("حرر في: بن زوه بتاريخ 2026/09/25", 300, 260, 150),
  ];
  const grid = reconstructTable(pieces);
  assert.ok(grid);
  assert.deepEqual(grid.table[0]!.map((c) => c.text), ["الترتيب", "اللقب", "الاسم", "الجنس", "تاريخ الميلاد"]);
  const res = parseTable(grid.table);
  assert.deepEqual(
    res.candidates.map((c) => `${c.last}/${c.first}/${c.gender}`),
    ["بن عمر/ياسين/M", "طاهري/نور الهدى/F", "قرنازي/سيف الدين/M"],
  );
  assert.equal(grid.table[2]![4]!.text, "2016-09-30");
  assert.equal(groupFromTitle(grid.title), "خامسة ابتدائي 01");
});

test("بلا صف عناوين أو بلا عمود ترتيب ⇒ null (يُستعمل التجميع بالأسطر)", () => {
  assert.equal(reconstructTable([w("بن عمر ياسين", 300, 10), w("طاهري هدى", 300, 30), w("قرنازي معاذ", 300, 50), w("لغراب ناصر", 300, 70)]), null);
});

test("رسم «لإ/لأ» المقلوب يُصحَّح", () => {
  assert.equal(fixLigatures("اإلعادة"), "الإعادة");
  assert.equal(fixLigatures("األمين"), "الأمين");
  assert.equal(fixLigatures("إلياس"), "إلياس");
  assert.equal(fixLigatures("ألفة"), "ألفة");
});

test("القسم من عنوان القائمة", () => {
  assert.equal(groupFromTitle("قائمة التلاميذ للسنة :رابعة ابتدائي 01 للسنة الدراسية : 2026 - 2027"), "رابعة ابتدائي 01");
  assert.equal(groupFromTitle("قائمة التلاميذ"), undefined);
});

test("دمج قراءتي الخلية", async () => {
  const { pickReading } = await import("./grid.ts");
  assert.equal(pickReading({ text: "الهدى", conf: 92 }, { text: "نور\nالهدى", conf: 88 }).text, "نور الهدى");
  assert.equal(pickReading({ text: "نور الهدى", conf: 70 }, { text: "نورالهدى", conf: 90 }).text, "نور الهدى");
  assert.equal(pickReading({ text: "شريفي", conf: 85 }, { text: "لتنربفقي", conf: 88 }).text, "شريفي");
  assert.equal(pickReading({ text: "", conf: 0 }, { text: "جنان", conf: 84 }).text, "جنان");
  assert.equal(pickReading({ text: "نستتن رحاب", conf: 0 }, { text: "تسنيم رحاب", conf: 91 }).text, "تسنيم رحاب");
});
