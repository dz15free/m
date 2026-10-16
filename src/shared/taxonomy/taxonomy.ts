import defaults from "./defaults.json" with { type: "json" };
import type { Stage } from "../dz/education.ts";

/* المستويات والمواد لكل طور. مصدر الحقيقة: `taxonomy/{stage}` في Firestore
   (يعدّلها الأدمن دون نشر جديد)، وهذا الملف قيمة افتراضية لنفس البنية
   تُستعمل قبل رفعها إلى القاعدة (scripts/seed-taxonomy.mjs). */

export type Localized = { ar: string; fr: string; en?: string };
export type Level = { id: string; order: number; label: Localized; short: Localized };
export type Subject = { id: string; label: Localized; levels: string[] };
export type StageTaxonomy = { levels: Level[]; subjects: Subject[] };

export const DEFAULT_TAXONOMY = defaults as Record<Stage, StageTaxonomy>;

/** التسميات الإنجليزية من القيم الافتراضية لما يأتي من القاعدة دونها (أُضيفت الإنجليزية بعد رفع التصنيف). */
const addEn = (v: Localized, en: string | undefined): Localized => (v.en || !en ? v : { ...v, en });

export function withEnglish(tax: StageTaxonomy, stage: Stage): StageTaxonomy {
  const def = DEFAULT_TAXONOMY[stage];
  return {
    levels: tax.levels.map((l) => {
      const d = def.levels.find((x) => x.id === l.id);
      return { ...l, label: addEn(l.label, d?.label.en), short: addEn(l.short, d?.short.en) };
    }),
    subjects: tax.subjects.map((s) => ({ ...s, label: addEn(s.label, def.subjects.find((x) => x.id === s.id)?.label.en) })),
  };
}

export function subjectsForLevel(tax: StageTaxonomy, levelId: string): Subject[] {
  return tax.subjects.filter((s) => s.levels.includes(levelId));
}

export function levelById(tax: StageTaxonomy, levelId: string): Level | undefined {
  return tax.levels.find((l) => l.id === levelId);
}

export function subjectById(tax: StageTaxonomy, subjectId: string): Subject | undefined {
  return tax.subjects.find((s) => s.id === subjectId);
}
