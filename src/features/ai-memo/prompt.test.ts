import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { aiMemoRequest, pickExample, SYSTEM_PROMPT, toMemo, userPrompt } from "./prompt.ts";

const examples = JSON.parse(readFileSync(new URL("./examples.gen.json", import.meta.url), "utf8"));

test("request validation accepts a platform lesson and rejects bad input", () => {
  const ok = aiMemoRequest.safeParse({ level: "4AP", subject: "math", lessonId: "4AP_math_012", topic: "الكسور", format: "official", minutes: 45 });
  assert.equal(ok.success, true);
  assert.equal(aiMemoRequest.safeParse({ level: "7AP", subject: "math", topic: "x", format: "official", minutes: 45 }).success, false);
  assert.equal(aiMemoRequest.safeParse({ level: "4AP", subject: "math", topic: "الكسور", format: "poem", minutes: 45 }).success, false);
  assert.equal(aiMemoRequest.safeParse({ level: "4AP", subject: "math", topic: "الكسور", format: "brief", minutes: 500 }).success, false);
});

test("toMemo normalises rows to the column count and credits the AI", () => {
  const { title, memo } = toMemo(
    {
      title: " الكسور ",
      head: [{ label: "المادة", value: "رياضيات" }, { label: "", value: "x" }],
      pre: "",
      cols: ["المراحل", "الوضعيات", "التقويم"],
      rows: [["الانطلاق", "نشاط"], ["بناء", "أ", "ب", "زائد"]],
      after: "واجب",
    },
    "ar",
  );
  assert.equal(title, "الكسور");
  assert.deepEqual(memo.head, [["المادة", "رياضيات"]]);
  assert.equal(memo.pre, undefined);
  assert.deepEqual(memo.rows, [["الانطلاق", "نشاط", ""], ["بناء", "أ", "ب"]]);
  assert.equal(memo.after, "واجب");
  assert.equal(memo.own, true);
  assert.ok(memo.author);
  assert.throws(() => toMemo({ title: "x", head: [], pre: "", cols: ["one"], rows: [["a"]], after: "" }, "ar"));
});

test("examples exist for the main middle subjects and fall back by language", () => {
  for (const s of ["ar", "math", "fr", "en", "science", "physics", "islamic"]) assert.ok(pickExample(examples, "2AM", s), s);
  assert.ok(pickExample(examples, "3AP", "math"), "primary math falls back to middle math");
  assert.ok(pickExample(examples, "3AP", "tamazight"), "unknown subject falls back to Arabic");
  for (const v of Object.values(examples) as { memo: { imgs?: unknown } }[]) assert.equal(v.memo.imgs, undefined);
});

test("the prompt carries the lesson context, duration and the teacher's notes", () => {
  const req = aiMemoRequest.parse({ level: "5AP", subject: "fr", topic: "Le présent", format: "detailed", minutes: 45, notes: "classe de 30 élèves" });
  const p = userPrompt(req, { objectives: ["Conjuguer être au présent"] }, null);
  assert.match(p, /Conjuguer être au présent/);
  assert.match(p, /45 دقيقة/);
  assert.match(p, /classe de 30 élèves/);
  assert.match(p, /الفرنسية/);
  assert.match(SYSTEM_PROMPT, /الجيل الثاني/);
});
