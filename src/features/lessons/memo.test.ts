import { test } from "node:test";
import assert from "node:assert/strict";
import { columnWidths, memoFigures, parseBlocks, parseInline, parseMath, withImages, type Memo } from "./memo.ts";

test("inline: bold, answers and math", () => {
  assert.deepEqual(parseInline("أ **ب** ==ج== $a = 2$"), [
    { t: "text", v: "أ " },
    { t: "b", c: [{ t: "text", v: "ب" }] },
    { t: "text", v: " " },
    { t: "hl", c: [{ t: "text", v: "ج" }] },
    { t: "text", v: " " },
    { t: "math", c: [{ t: "text", v: "a = 2" }] },
  ]);
});

test("math: fractions, roots, powers and indices", () => {
  assert.deepEqual(parseMath("\\frac{a}{k} + x^{2} - \\sqrt{9} H_2"), [
    { t: "frac", n: [{ t: "text", v: "a" }], d: [{ t: "text", v: "k" }] },
    { t: "text", v: " + x" },
    { t: "sup", c: [{ t: "text", v: "2" }] },
    { t: "text", v: " - " },
    { t: "sqrt", c: [{ t: "text", v: "9" }] },
    { t: "text", v: " H" },
    { t: "sub", c: [{ t: "text", v: "2" }] },
  ]);
});

test("blocks: headings, lists, boxes, tables, figures, gaps", () => {
  const b = parseBlocks("## الوضعية\n- أ\n- ب\n\n> سطر 1\n> - عنصر\n! حوصلة\n|س|ص|\n|---|---|\n|1|2|\n[[fig b:9 0.1 0.2 0.5 0.3]]\n[[img 0]]\n\n");
  assert.deepEqual(
    b.map((x) => x.t),
    ["h", "ul", "gap", "box", "box", "table", "fig", "img"],
  );
  const sit = b[3] as Extract<(typeof b)[number], { t: "box" }>;
  assert.equal(sit.kind, "sit");
  assert.deepEqual(sit.c.map((x) => x.t), ["p", "ul"]);
  const table = b[5] as Extract<(typeof b)[number], { t: "table" }>;
  assert.equal(table.head?.length, 2);
  assert.equal(table.rows.length, 1);
  assert.deepEqual(b[6], { t: "fig", ref: "b:9", box: [0.1, 0.2, 0.5, 0.3] });
});

test("figures are listed in order and swapped for published images", () => {
  const memo: Memo = { head: [], pre: "[[fig b:3 0 0 1 0.5]]", cols: ["أ", "ب"], rows: [["x", "[[fig b:4 0.1 0.1 0.2 0.2]]"]], after: "" };
  assert.deepEqual(memoFigures(memo).map((f) => f.ref), ["b:3", "b:4"]);
  const out = withImages(memo, ["A", "B"]);
  assert.equal(out.pre, "[[img 0]]");
  assert.equal(out.rows[0]![1], "[[img 1]]");
  assert.deepEqual(out.imgs, ["A", "B"]);
});

test("column widths favour the column with the most text", () => {
  const memo: Memo = { head: [], cols: ["المراحل", "المدة", "سير الدرس", "التقويم"], rows: [["تهيئة", "5 د", "نص طويل جدًا ".repeat(10), "تقويم قصير"]] };
  const w = columnWidths(memo);
  assert.equal(w.indexOf(Math.max(...w)), 2);
  assert.ok(w.every((x) => x >= 7));
});
