import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { memoFileRev } from "../lessons/memo-rev.ts";
import { memoFigures, type Memo } from "../lessons/memo.ts";

/* content/memos/<id>.json: الفهرس المولَّد مطابق، وكل مذكرة لحصة موجودة في منهاجها المنشور، وجدولها سليم. */
const DIR = new URL("../../../content/memos/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
const gen = readFileSync(new URL("./curriculum-memos.gen.ts", import.meta.url), "utf8");
const catalog = readFileSync(new URL("./curriculum-catalog.ts", import.meta.url), "utf8");

test("the generated memo index is up to date (node scripts/curriculum/memo-index.mjs)", () => {
  const listed = [...gen.matchAll(/^ {2}"([^"]+)": \{ rev: "([0-9a-f]+)", count: (\d+),/gm)].map(([, id, rev, n]) => [id, rev, Number(n)]);
  const actual = files.map((f) => {
    const memos = JSON.parse(readFileSync(new URL(f, DIR), "utf8")) as Record<string, unknown>;
    return [f.slice(0, -5), memoFileRev(memos), Object.keys(memos).length];
  });
  assert.deepEqual(listed, actual.sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
});

for (const f of files) {
  const id = f.slice(0, -5);
  test(`memos of ${id} belong to its lessons and are well-formed`, () => {
    assert.ok(catalog.includes(`content/curriculum/${id}.json"`), `${id} is not in curriculum-catalog.ts`);
    const cur = JSON.parse(readFileSync(new URL(`../../../content/curriculum/${id}.json`, import.meta.url), "utf8")) as { lessons: { pages?: (string | number)[] }[] };
    const memos = JSON.parse(readFileSync(new URL(f, DIR), "utf8")) as Record<string, Memo>;
    for (const [key, memo] of Object.entries(memos)) {
      const lesson = cur.lessons.find((l) => String(l.pages?.[0]) === key);
      assert.ok(lesson, `${id} ${key}: no lesson starts at this page`);
      assert.ok(memo.cols.length >= 2, `${id} ${key}: table needs columns`);
      for (const row of memo.rows) assert.equal(row.length, memo.cols.length, `${id} ${key}: row width`);
      for (const fig of memoFigures(memo)) {
        assert.ok(lesson.pages!.map(String).includes(fig.ref), `${id} ${key}: figure from another lesson's page ${fig.ref}`);
        const [x, y, w, h] = fig.box;
        assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 1.001 && y + h <= 1.001, `${id} ${key}: figure box`);
      }
      assert.ok(!memo.imgs, `${id} ${key}: imgs are filled at publish time only`);
    }
  });
}
