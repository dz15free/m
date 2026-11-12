import { test } from "node:test";
import assert from "node:assert/strict";
import defaults from "../taxonomy/defaults.json" with { type: "json" };
import { baseLevel, parseSecondary, programLevel, secondaryLevels, streamSubjects } from "./secondary.ts";
import { curriculumId } from "../../features/lessons/logic.ts";

test("stream levels parse and reduce to their year", () => {
  assert.deepEqual(parseSecondary("2AS-SE"), { year: 2, stream: "SE" });
  assert.equal(parseSecondary("1AS-SE"), null);
  assert.equal(parseSecondary("2AS"), null);
  assert.equal(baseLevel("3AS-LP"), "3AS");
  assert.equal(baseLevel("4AM"), "4AM");
  assert.equal(secondaryLevels().length, 14);
});

test("streams sharing a programme share one curriculum", () => {
  assert.equal(curriculumId("2AS-TM", "math"), "2AS-M_math");
  assert.equal(curriculumId("2AS-M", "physics"), "2AS-SE_physics");
  assert.equal(curriculumId("2AS-LE", "physics"), "2AS-LP_physics");
  assert.equal(curriculumId("3AS-GE", "ar"), "3AS-SE_ar");
  assert.equal(curriculumId("1AS-L", "ar"), "1AS-L_ar");
  assert.equal(curriculumId("5AP", "ar"), "5AP_ar");
  assert.equal(programLevel("2AS-GE", "economics"), "2AS-GE");
});

test("the default secondary taxonomy matches the stream subjects", () => {
  for (const l of defaults.secondary.levels) {
    const p = parseSecondary(l.id);
    assert.ok(p, l.id);
    const subjects = defaults.secondary.subjects.filter((s) => s.levels.includes(l.id)).map((s) => s.id);
    assert.deepEqual([...subjects].sort(), [...streamSubjects(p.year, p.stream)].sort(), l.id);
  }
});
