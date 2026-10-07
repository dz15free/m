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
    ["Contrat d'apprentissage (projet + séquences + tâches)", "Contrat d'apprentissage (projet + séquences + tâches) (20 mn)"],
    ["Oral / compréhension — Oral / production", "Oral / compréhension — Oral / production (40 mn)"],
  ]);
  assert.equal(p[0]!.id, "id1");
});

test("الخامسة: القواعد 1 في الحصة الثالثة والقواعد 2 في الرابعة", () => {
  assert.equal(frenchDayPlan(cur5, 3, 2)![1]!.id, "id4");
  assert.equal(frenchDayPlan(cur5, 4, 0)![1]!.id, "id5");
});

test("مقطع من 3 أسابيع: آخر حصة = compte rendu + التقويم", () => {
  const p = frenchDayPlan(cur5, 5, 2)!;
  assert.deepEqual(p.map((x) => [x.a, x.ss]), [["Compte rendu et réécriture", "Compte rendu et réécriture (30 mn)"], ["Évaluation séquentielle", "Évaluation séquentielle (30 mn)"]]);
});

test("مقطع من 4 أسابيع: الأسبوع الرابع = التقويم (1سا) ثم القصيدة والإنجاز (1سا30)", () => {
  const cur = { ...cur5, entries: [...cur5.entries, e(8, 6, 1, "Réalisation du projet (30 mn)", "Réalisation du projet — X")] };
  assert.deepEqual(frenchDayPlan(cur, 6, 0)!.map((x) => x.ss), ["Évaluation séquentielle (60 mn)"]);
  assert.deepEqual(frenchDayPlan(cur, 6, 1)!.map((x) => x.ss), ["Poème (prononciation et prosodie) (45 mn)", "Réalisation partielle et/ou finale du projet (45 mn)"]);
  assert.deepEqual(frenchDayPlan(cur, 6, 2), []);
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

test("الرابعة: البطاقات الكاملة (Présentation، Compréhension de l’écrit، Tâche) في أماكنها", () => {
  const cur4 = {
    level: "4AP",
    subject: "fr",
    segments: [{ n: 5, title: "Projet 1 : X — Séquence 1 : Tu habites où ? (Programme de la 4e A.P)" }],
    entries: [
      e(1, 16, 5, "Présentation du projet (45 mn)", "Présentation du projet — Tu habites où ?"),
      e(2, 16, 5, "Oral compréhension (45 mn)", "Oral compréhension : Saluer — Tu habites où ?"),
      e(3, 16, 5, "Compréhension de l’écrit 1 (45 mn)", "Compréhension de l’écrit 1 : L’immeuble blanc — Tu habites où ?"),
      e(4, 16, 5, "Vocabulaire (45 mn)", "Vocabulaire : les articles — Tu habites où ?"),
      e(5, 16, 5, "Oral production 1 (45 mn)", "Oral production 1 : Saluer — Tu habites où ?"),
      e(6, 18, 5, "Grammaire (45 mn)", "Grammaire : Le nom — Tu habites où ?"),
      e(7, 20, 5, "Oral production 2 (45 mn)", "Oral production 2 : Saluer — Tu habites où ?"),
      e(8, 20, 5, "Production écrite (45 mn)", "Production écrite — Tu habites où ?"),
      e(9, 20, 5, "Tâche 1 (30 mn)", "Tâche 1 : Je fabrique le présentoir — Tu habites où ?"),
      e(10, 20, 5, "Evaluation (60 mn)", "Evaluation — Tu habites où ?"),
      e(11, 19, 5, "Conjugaison (45 mn)", "Conjugaison : être — Tu habites où ?"),
    ],
  };
  assert.deepEqual(frenchDayPlan(cur4, 16, 0)!.map((x) => x.id), ["id1", "id2", "id5"]);
  assert.deepEqual(frenchDayPlan(cur4, 16, 1)!.map((x) => x.id), ["id3", "id4"]);
  assert.deepEqual(frenchDayPlan(cur4, 20, 0)!.map((x) => x.id), ["id7", "id8"]);
  assert.deepEqual(frenchDayPlan(cur4, 20, 1)!.map((x) => [x.id, x.t]), [["id8", "Production écrite — Tu habites où ?"], ["id9", "Je fabrique le présentoir — Tu habites où ?"], ["id10", "Evaluation — Tu habites où ?"]]);
});
