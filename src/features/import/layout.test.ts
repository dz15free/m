import { test } from "node:test";
import assert from "node:assert/strict";
import { piecesToTable, type Piece } from "./layout.ts";
import { parseTable } from "./table.ts";

/** كلمة في صورة: x من اليسار، y من الأعلى، ارتفاع السطر 20 بكسل. */
const w = (text: string, x0: number, x1: number, y: number, conf = 90): Piece => ({
  text,
  conf,
  box: { x0, x1, y0: y, y1: y + 20 },
});

test("جدول عربي من اليمين لليسار: الرقم | اللقب | الاسم", () => {
  // الصفحة: [الاسم ........ اللقب ........ الرقم] بصريًا من اليسار
  const pieces = [
    w("الاسم", 100, 160, 10), w("اللقب", 300, 360, 12), w("الرقم", 500, 560, 10),
    w("ياسين", 100, 160, 50), w("عمر", 300, 340, 52), w("بن", 350, 370, 51), w("1", 530, 540, 50),
    w("الهدى", 60, 110, 90, 70), w("نور", 120, 160, 90, 80), w("حمداني", 300, 370, 91), w("2", 530, 540, 90),
  ];
  const table = piecesToTable(pieces);
  assert.deepEqual(table.map((r) => r.map((c) => c.text)), [
    ["الرقم", "اللقب", "الاسم"],
    ["1", "بن عمر", "ياسين"],
    ["2", "حمداني", "نور الهدى"],
  ]);
  assert.equal(table[2]![2]!.conf, 75, "ثقة الخلية = متوسط كلماتها");

  const res = parseTable(table);
  assert.deepEqual(res.candidates.map((c) => `${c.last}/${c.first}`), ["بن عمر/ياسين", "حمداني/نور الهدى"]);
});

test("قائمة فرنسية من اليسار لليمين مع سطر مائل قليلًا", () => {
  const pieces = [
    w("1", 20, 30, 10), w("BENAMAR", 80, 170, 12), w("Yacine", 178, 240, 14),
    w("2", 20, 30, 50), w("HAMDANI", 80, 170, 49), w("Nour", 178, 220, 51), w("El", 226, 244, 50), w("Houda", 250, 310, 52),
  ];
  const res = parseTable(piecesToTable(pieces));
  assert.deepEqual(res.candidates.map((c) => `${c.last}/${c.first}`), ["BENAMAR/Yacine", "HAMDANI/Nour El Houda"]);
});

test("مقاطع PDF المقطّعة داخل الكلمة تُلصق دون مسافة", () => {
  const pieces = [w("حمد", 330, 370, 10), w("اني", 300, 329, 10)];
  assert.deepEqual(piecesToTable(pieces).map((r) => r.map((c) => c.text)), [["حمداني"]]);
});

test("PDF بحروف أشكال العرض، حرفًا حرفًا، مع أرقام في السطر (كما يكتبها Chromium)", () => {
  // «بن عمر» | «ياسين» | «1» — كل حرف قطعة مستقلة بشكل العرض، والأرقام تجعل السطر ملتبسًا
  const glyphs = (word: string, xRight: number, y: number) => {
    const chars = [...word]; // أشكال العرض كما هي، دون توحيد
    return chars.map((ch, i) => w(ch, xRight - (i + 1) * 8, xRight - i * 8, y));
  };
  const pieces = [
    ...glyphs("\uFE8F\uFEE6", 380, 10), ...glyphs("\uFECB\uFEE4\uFEAE", 355, 10),
    ...glyphs("\uFEF3\uFE8E\uFEB3\uFEF4\uFEE6", 200, 10),
    w("1", 520, 528, 10),
  ];
  const [row] = piecesToTable(pieces);
  assert.equal(row!.map((c) => c.text.normalize("NFKC")).join(" | "), "1 | بن عمر | ياسين");
});
