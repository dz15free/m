import { test } from "node:test";
import assert from "node:assert/strict";
import { absenceGrid, monthRange, pupilWord } from "./logic.ts";

test("كشف الغيابات الشهري", () => {
  const g = absenceGrid(
    ["s1", "s2"],
    [
      { date: "2026-10-05", part: "pm", attendance: { s1: "A" } },
      { date: "2026-10-05", part: "am", attendance: { s1: "A", s2: "L" } },
      { date: "2026-10-06", part: "am", attendance: { s2: "E" } },
    ],
  );
  assert.deepEqual(g.days, ["2026-10-05", "2026-10-06"]);
  assert.deepEqual(g.rows[0], { studentId: "s1", cells: { "2026-10-05": "غغ" }, a: 2, e: 0, l: 0 });
  assert.deepEqual(g.rows[1], { studentId: "s2", cells: { "2026-10-05": "ت", "2026-10-06": "م" }, a: 0, e: 1, l: 1 });
});

test("حدود الشهر والصيغة", () => {
  assert.deepEqual(monthRange("2027-02"), { start: "2027-02-01", end: "2027-02-28" });
  assert.deepEqual(monthRange("2028-02").end, "2028-02-29");
  assert.equal(pupilWord("F", "ar"), "التلميذة");
  assert.equal(pupilWord(null, "ar"), "التلميذ(ة)");
});
