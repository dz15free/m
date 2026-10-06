import { test } from "node:test";
import assert from "node:assert/strict";
import { frenchDayPlan } from "./fr-sequence.ts";
import type { CurriculumEntry } from "./logic.ts";

const e = (o: number, u: number, s: number, ss: string, t: string): CurriculumEntry => ({ id: `id${o}`, o, s, k: "week", u, a: "Français", ss, d: "Composante", t, b: false, sm: false });

const cur5 = {
  level: "5AP",
  subject: "fr",
  segments: [{ n: 1, title: "Projet 1 : Au zoo ! — Séquence 1 : Pauvre petite gazelle !" }],
  entries: [
    e(1, 3, 1, "Présentation du projet (45 mn)", "Présentation du projet — Pauvre petite gazelle !"),
    e(2, 3, 1, "Oral compréhension (45 mn)", "Oral compréhension — Pauvre petite gazelle !"),
    e(3, 3, 1, "Vocabulaire (45 mn)", "Vocabulaire : Parties du corps — Pauvre petite gazelle !"),
    e(4, 4, 1, "Grammaire (45 mn)", "Grammaire : L'adjectif — Pauvre petite gazelle !"),
    e(5, 4, 1, "Grammaire (45 mn)", "Grammaire : La pronominalisation — Pauvre petite gazelle !"),
    e(6, 5, 1, "Comptine (30 mn)", "Comptine : Alouette — Pauvre petite gazelle !"),
    e(7, 5, 1, "Evaluation (60 mn)", "Evaluation — Pauvre petite gazelle !"),
  ],
};

test("الخامسة: اليوم الأول من الأسبوع الأول = عقد التعلم 20 + الشفهي 40", () => {
  const p = frenchDayPlan(cur5, 3, 0)!;
  assert.deepEqual(p.map((x) => [x.a, x.ss]), [
    ["Contrat d'apprentissage", "Contrat d'apprentissage (20 mn)"],
    ["Oral réception / production", "Oral réception / production (40 mn)"],
  ]);
  assert.equal(p[0]!.id, "id1");
});

test("الخامسة: يوم القواعد يأخذ بطاقتي القواعد بالترتيب", () => {
  const p = frenchDayPlan(cur5, 4, 0)!;
  assert.deepEqual(p.map((x) => [x.id, x.t]), [["id4", "L'adjectif — Pauvre petite gazelle !"], ["id5", "La pronominalisation — Pauvre petite gazelle !"]]);
});

test("مقطع من 3 أسابيع: التقويم يُلحق بآخر يوم", () => {
  const p = frenchDayPlan(cur5, 5, 2)!;
  assert.deepEqual(p.map((x) => x.a), ["Compte rendu", "Poème / Comptine", "Évaluation séquentielle"]);
});

test("غير الفرنسية أو مقطع الاستدراك: null", () => {
  assert.equal(frenchDayPlan({ ...cur5, subject: "ar" }, 3, 0), null);
  assert.equal(frenchDayPlan({ ...cur5, level: "4AP", segments: [{ n: 1, title: "Projet 3 — Séquence 3 : X (Suite du programme de la 3e A.P)" }] }, 3, 0), null);
});

test("الرابعة: الأسبوع الأول اليوم الأول = 10 + 30 + 20", () => {
  const cur4 = {
    level: "4AP",
    subject: "fr",
    segments: [{ n: 5, title: "Projet 1 : X — Séquence 1 : Y (Programme de la 4e A.P)" }],
    entries: [e(1, 13, 5, "Séance 1/10 (30 min)", "Acte de parole — Y"), e(2, 14, 5, "Séance 2/10 (30 min)", "Grammaire — Y")],
  };
  assert.deepEqual(frenchDayPlan(cur4, 13, 0)!.map((x) => x.ss), ["Négociation du projet (thème et tâche à réaliser) (10 mn)", "Oral / Compréhension (30 mn)", "Oral / Production (20 mn)"]);
});
