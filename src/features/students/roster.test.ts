import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addStudents,
  findDuplicates,
  moveStudents,
  removeStudents,
  RosterFullError,
  rosterToCsv,
  searchRoster,
  sortAlphabetically,
  updateStudent,
  type Student,
} from "./roster.ts";
import { nameKey, similarity } from "../../shared/text/names.ts";

const make = (...names: [string, string][]) => addStudents([], names.map(([last, first]) => ({ last, first })));

test("الإضافة تنظّف المسافات وتتجاهل الصفوف الفارغة", () => {
  const r = addStudents([], [{ last: "  بن   عمر ", first: "ياسين" }, { last: " ", first: "" }]);
  assert.equal(r.length, 1);
  assert.equal(r[0]!.last, "بن عمر");
  assert.equal(r[0]!.gender, null);
  assert.equal(r[0]!.id.length, 8);
});

test("الحد الأقصى لعدد التلاميذ", () => {
  const full = make(...Array.from({ length: 60 }, (_, i): [string, string] => [`لقب${i}`, "اسم"]));
  assert.throws(() => addStudents(full, [{ last: "زائد", first: "x" }]), RosterFullError);
});

test("التعديل والحذف يحافظان على المعرّفات والترتيب", () => {
  const r = make(["أ", "1"], ["ب", "2"], ["ج", "3"]);
  const edited = updateStudent(r, r[1]!.id, { last: "بب", first: "22", gender: "F" });
  assert.equal(edited[1]!.id, r[1]!.id);
  assert.equal(edited[1]!.gender, "F");
  const removed = removeStudents(edited, new Set([r[0]!.id]));
  assert.deepEqual(removed.map((s) => s.last), ["بب", "ج"]);
});

test("الترتيب الأبجدي باللقب ثم الاسم", () => {
  const r = make(["حمداني", "نور الهدى"], ["بوجلال", "آية"], ["بن عمر", "ياسين"], ["بوجلال", "أمين"]);
  assert.deepEqual(sortAlphabetically(r).map((s) => `${s.last} ${s.first}`), [
    "بن عمر ياسين",
    "بوجلال آية",
    "بوجلال أمين",
    "حمداني نور الهدى",
  ]);
});

test("النقل بين قسمين بنفس المعرّف", () => {
  const a = make(["أ", "1"], ["ب", "2"]);
  const b = make(["ج", "3"]);
  const { from, to } = moveStudents(a, b, new Set([a[0]!.id]));
  assert.equal(from.length, 1);
  assert.equal(to.length, 2);
  assert.equal(to[1]!.id, a[0]!.id);
});

test("البحث يتجاهل الهمزات والتشكيل والترتيب", () => {
  const r = make(["بوجلال", "آية"], ["خنان", "سعيد"]);
  assert.equal(searchRoster(r, "اية").length, 1);
  assert.equal(searchRoster(r, "سعيد خنان").length, 1);
  assert.equal(searchRoster(r, "").length, 2);
});

test("كشف التكرار المحتمل", () => {
  assert.equal(nameKey("بوجلال أية"), nameKey("بوجلال آية"));
  assert.ok(similarity("Benamar Yacine", "Ben Amar Yacine") > 0.9);
  const r = make(["بوجلال", "آية"], ["بوجلال", "أية"], ["خنان", "سعيد"]);
  assert.equal(findDuplicates(r).length, 1);
});

test("CSV مع BOM وهروب الفواصل", () => {
  const r: Student[] = [{ id: "x", last: "بن عمر", first: "ياسين, محمد", gender: "M" }];
  const csv = rosterToCsv(r, { n: "رقم", last: "اللقب", first: "الاسم", gender: "الجنس" }, (g) => (g === "M" ? "ذكر" : "أنثى"));
  assert.ok(csv.startsWith("﻿"));
  assert.ok(csv.includes('"ياسين, محمد"'));
  assert.ok(csv.endsWith("1,بن عمر,\"ياسين, محمد\",ذكر"));
});
