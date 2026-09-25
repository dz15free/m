import { test } from "node:test";
import assert from "node:assert/strict";
import { academicYearFor, parseAcademicYearId } from "./academic-year.ts";

test("من أوت إلى ديسمبر: السنة الجديدة", () => {
  assert.equal(academicYearFor(new Date(2026, 8, 24)).id, "2026-2027");
  assert.equal(academicYearFor(new Date(2026, 7, 25)).label, "2026/2027");
  assert.equal(academicYearFor(new Date(2026, 11, 31)).id, "2026-2027");
});

test("من جانفي إلى جويلية: السنة الجارية التي بدأت في الخريف الماضي", () => {
  assert.equal(academicYearFor(new Date(2027, 0, 1)).id, "2026-2027");
  assert.equal(academicYearFor(new Date(2027, 6, 31)).id, "2026-2027");
});

test("تحليل المعرّف", () => {
  assert.deepEqual(parseAcademicYearId("2026-2027"), { id: "2026-2027", label: "2026/2027", startYear: 2026 });
  assert.equal(parseAcademicYearId("2026-2028"), null);
  assert.equal(parseAcademicYearId("2026/2027"), null);
});
