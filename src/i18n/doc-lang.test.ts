import { test } from "node:test";
import assert from "node:assert/strict";
import { DOC, docDirectorate, docHoliday, docLangOf, docLevel, docMonth } from "./doc-lang.ts";

test("docLangOf: only a class taught entirely in one foreign language gets a document language", () => {
  assert.equal(docLangOf(["en"]), "en");
  assert.equal(docLangOf(["fr"]), "fr");
  assert.equal(docLangOf(["fr", "en"]), null);
  assert.equal(docLangOf(["ar", "fr"]), null);
  assert.equal(docLangOf([]), null);
});

test("labels, months and levels in the subject's language", () => {
  assert.equal(DOC.en.sessions, "Sessions");
  assert.equal(DOC.fr.activity, "Activité");
  assert.equal(DOC.en.exams(1), "1st term exams");
  assert.equal(DOC.fr.exams(2), "Examens du 2e trimestre");
  assert.equal(docMonth("2026-10", "en"), "October 2026");
  assert.equal(docMonth("2026-10", "fr"), "octobre 2026");
  const level = { id: "5AP", order: 5, label: { fr: "5e année primaire" } };
  assert.equal(docLevel(level, "en", "5AP"), "5th Grade — Primary School");
  assert.equal(docLevel(level, "fr", "5AP"), "5e année primaire");
  assert.equal(docLevel(undefined, "en", "5AP"), "5AP");
});

test("holidays and directorate", () => {
  assert.equal(docHoliday({ fr: "Vacances d'hiver" }, "en"), "Winter holidays");
  assert.equal(docHoliday({ fr: "Vacances d'hiver" }, "fr"), "Vacances d'hiver");
  assert.equal(docHoliday(undefined, "en"), "Holidays");
  assert.equal(docDirectorate(16, "en", "x"), "Education Directorate of Alger");
  assert.equal(docDirectorate(undefined, "fr", "مديرية"), "مديرية");
});
