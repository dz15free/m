/* الفرنسية — «Le déroulement séquentiel»: نشاطات كل يوم من أسابيع المقطع ومددها الرسمية.
   - الرابعة: الملحق (2) الوزاري 2026/2027 — 4 أسابيع × يومان (ساعة لكل يوم).
   - الخامسة: نموذج «Déroulement séquentiel» (مشروع Au zoo) — 4 أسابيع × 3 أيام.
   المحتوى والأهداف من البطاقة المقابلة في مذكرات المقطع؛ الاسم والمدة من الجدول الرسمي.
   مقاطع استدراك برنامج الثالثة والتقويم التشخيصي لا جدول لها هنا، فتبقى كما في المذكرات. */
import type { Curriculum, CurriculumEntry } from "./logic.ts";

type Act = { name: string; min: number; /** بالأولوية: أول نمط له بطاقة يُعتمد */ match?: RegExp[]; nth?: number };
type Template = Act[][][]; // أسبوع ← يوم ← نشاطات

const FR_4AP: Template = [
  [
    [
      { name: "Négociation du projet (thème et tâche à réaliser)", min: 10, match: [/Acte de parole/i] },
      { name: "Oral / Compréhension", min: 30, match: [/Acte de parole/i] },
      { name: "Oral / Production", min: 20, match: [/Acte de parole/i, /Oral production/i] },
    ],
    [
      { name: "Lecture / Compréhension (texte 1)", min: 30, match: [/Lecture compréhension/i] },
      { name: "Lexique", min: 30, match: [/Lexique/i] },
    ],
  ],
  [
    [
      { name: "Lecture / Compréhension (texte 2)", min: 30, match: [/Lecture compréhension/i] },
      { name: "Grammaire 1", min: 30, match: [/Grammaire/i] },
    ],
    [
      { name: "Lecture systématique", min: 30, match: [/Lecture systématique/i] },
      { name: "Grammaire 2", min: 30, match: [/Grammaire/i], nth: 1 },
    ],
  ],
  [
    [
      { name: "Entraînement à la lecture fluence", min: 30, match: [/fluence/i] },
      { name: "Conjugaison", min: 30, match: [/Conjugaison/i] },
    ],
    [
      { name: "Orthographe", min: 40, match: [/Orthographe/i] },
      { name: "Phonétique articulatoire ou dictée", min: 20, match: [/Phonétique/i, /Dictée/i] },
    ],
  ],
  [
    [
      { name: "Production orale (entraînement et mobilisation)", min: 30, match: [/Production/i] },
      { name: "Production écrite (jet 1 + jet 2)", min: 30, match: [/Production/i] },
    ],
    [
      { name: "Compte rendu", min: 20, match: [/Compte rendu/i, /Production/i] },
      { name: "Réalisation (partielle / finale) du projet", min: 20, match: [/Réalisation/i] },
      { name: "Évaluation séquentielle", min: 20, match: [/[ÉE]valuation/i] },
    ],
  ],
];

/* الخامسة: «Déroulement d'une séquence d'apprentissage en 5e AP» — 3 حصص (vacations) من ساعة أسبوعيًا،
   11 حصة في المقطع (الحادية عشرة ساعة ونصف). مدة كل نشاط داخل الساعة «تتبع طبيعة الموضوع»:
   نقسمها افتراضيًا 30 + 30 (والأولى 20 + 40 كما في نموذج Au zoo). */
const FR_5AP: Template = [
  [
    [
      { name: "Contrat d'apprentissage (projet + séquences + tâches)", min: 20, match: [/Présentation du projet/i] },
      { name: "Oral / compréhension — Oral / production", min: 40, match: [/Oral compréhension/i] },
    ],
    [
      { name: "Compréhension de l'écrit (texte 1)", min: 30, match: [/Compréhension de l.écrit 1/i, /Compréhension de l.écrit/i] },
      { name: "Vocabulaire", min: 30, match: [/Vocabulaire/i] },
    ],
    [
      { name: "Compréhension de l'écrit (texte 2)", min: 30, match: [/Compréhension de l.écrit 2/i, /Compréhension de l.écrit/i] },
      { name: "Grammaire (ressource linguistique 1)", min: 30, match: [/Grammaire/i] },
    ],
  ],
  [
    [
      { name: "Lecture systématique (correspondance graphie/phonie)", min: 30, match: [/Lecture systématique/i] },
      { name: "Grammaire (ressource linguistique 2)", min: 30, match: [/Grammaire/i], nth: 1 },
    ],
    [
      { name: "Conjugaison", min: 30, match: [/Conjugaison/i] },
      { name: "Orthographe", min: 30, match: [/Orthographe/i] },
    ],
    [
      { name: "Correspondance phonie/graphie et/ou phonétique articulatoire", min: 30, match: [/Lecture systématique 2/i, /Phonétique/i, /Lecture systématique/i], nth: 1 },
      { name: "Dictée", min: 30, match: [/Dictée/i] },
    ],
  ],
  [
    [
      { name: "Entraînement à la mobilisation (à l'oral)", min: 30, match: [/Préparation à l.écrit/i, /Oral production/i] },
      { name: "Production orale", min: 30, match: [/Oral production 2/i, /Oral production/i] },
    ],
    [
      { name: "Production écrite (1er jet)", min: 30, match: [/Production écrite/i] },
      { name: "Production écrite (2e jet)", min: 30, match: [/Production écrite/i] },
    ],
    [
      { name: "Compte rendu et réécriture", min: 30, match: [/Compte rendu/i] },
      { name: "Activités de remédiation", min: 30, match: [/Compte rendu/i] },
    ],
  ],
  [
    [{ name: "Évaluation séquentielle", min: 60, match: [/[ÉE]valuation/i] }],
    [
      { name: "Poème (prononciation et prosodie)", min: 45, match: [/Comptine/i, /Poème/i] },
      { name: "Réalisation partielle et/ou finale du projet", min: 45, match: [/Réalisation/i] },
    ],
  ],
];

const TEMPLATES: Record<string, Template> = { "4AP": FR_4AP, "5AP": FR_5AP };

/** نزع اسم النشاط من بداية موضوع البطاقة («Vocabulaire : X — Séquence» ← «X — Séquence»). */
const topicOf = (t: string) => t.replace(/^[^:—]{2,60}:\s*/, "");

/** نشاطات يوم فرنسية في الأسبوع الدراسي schoolWeek (dayIdx = ترتيب حصة الفرنسية في الأسبوع، من 0).
 *  null ⇐ لا جدول لهذا المقطع (يبقى الاقتراح العادي)؛ [] ⇐ لا نشاط مقرر لهذا اليوم. */
export function frenchDayPlan(cur: Pick<Curriculum, "level" | "subject" | "entries" | "segments">, schoolWeek: number, dayIdx: number): CurriculumEntry[] | null {
  const tpl = cur.subject === "fr" ? TEMPLATES[cur.level] : undefined;
  if (!tpl) return null;
  const segOf = cur.entries.find((e) => e.k === "week" && e.u === schoolWeek && e.s !== 0)?.s;
  if (segOf === undefined) return null;
  const segTitle = cur.segments.find((s) => s.n === segOf)?.title ?? "";
  if (/Suite du programme/i.test(segTitle)) return null;
  const fiches = cur.entries.filter((e) => e.s === segOf).sort((a, b) => a.o - b.o);
  const weeks = [...new Set(fiches.map((e) => e.u))].sort((a, b) => a - b);
  const rank = weeks.indexOf(schoolWeek);
  // مقطع من 3 أسابيع (الخامسة): الأسبوع الأخير يأخذ يوم التقويم في آخره
  const tw = Math.min(rank, tpl.length - 1);
  const days = tpl[tw]!;
  let acts = days[dayIdx];
  // مقطع أقصر من الجدول (3 أسابيع في الخامسة): آخر حصة فيه = compte rendu + التقويم المرحلي
  if (rank === weeks.length - 1 && tw < tpl.length - 1 && dayIdx === days.length - 1 && acts) {
    const evaluation = tpl[tpl.length - 1]!.flat().find((a) => /valuation/i.test(a.name));
    acts = [{ ...acts[0]!, min: 30 }, ...(evaluation ? [{ ...evaluation, min: 30 }] : [])];
  }
  if (!acts) return [];
  const seqTitle = segTitle.replace(/^.*Séquence\s*\d+\s*:\s*/i, "").replace(/\s*\(.*\)\s*$/, "");
  return acts.map((act) => {
    let f: CurriculumEntry | undefined;
    for (const re of act.match ?? []) {
      const found = fiches.filter((e) => re.test(`${e.ss ?? ""} ${e.t}`));
      f = found[act.nth ?? 0] ?? found[0];
      if (f) break;
    }
    return {
      id: f?.id ?? "",
      o: f?.o ?? 0,
      s: segOf,
      k: "week",
      u: schoolWeek,
      a: act.name,
      ss: `${act.name} (${act.min} mn)`,
      d: f?.d ?? "",
      t: f ? topicOf(f.t) : seqTitle,
      b: f?.b ?? false,
      sm: f?.sm ?? false,
    };
  });
}
