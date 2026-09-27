/* المذكرات الجاهزة: منطق مشترك (بلا Firebase) — التجميع والوصول. */
import type { Access } from "@/shared/billing/plans";

export type CurriculumEntry = {
  id: string;
  /** الترتيب في السنة */
  o: number;
  /** المقطع */
  s: number;
  /** وحدة الزمن: أسبوع أو يوم (الفترة التمهيدية) */
  k: "week" | "day";
  u: number;
  /** النشاط (نوع الحصة) */
  a: string;
  /** الميدان */
  d: string;
  /** الموضوع */
  t: string;
  /** للحصة سير مكتوب */
  b: boolean;
  /** نموذج كامل متاح في التجربة */
  sm: boolean;
};

export type Curriculum = {
  id: string;
  level: string;
  subject: string;
  title: string;
  source: { ar: string; fr: string };
  segments: { n: number; title: string }[];
  entries: CurriculumEntry[];
};

export type LessonSummary = {
  curriculumId: string;
  level: string;
  subject: string;
  order: number;
  segment: number;
  segmentTitle: string;
  unitKind: "week" | "day";
  unit: number;
  session: string;
  activity: string;
  domain: string;
  topic: string;
  materials: string;
  objectives: string[];
  hasBody: boolean;
  sample: boolean;
  source: { ar: string; fr: string };
};

export type Unit = { key: string; kind: "week" | "day"; n: number; entries: CurriculumEntry[] };
export type SegmentGroup = { n: number; title: string; units: Unit[] };

/** مقطع ← أسابيع (أو أيام) ← حصص، بترتيب الوثيقة. */
export function groupCurriculum(c: Pick<Curriculum, "segments" | "entries">): SegmentGroup[] {
  const out: SegmentGroup[] = [];
  for (const e of [...c.entries].sort((a, b) => a.o - b.o)) {
    let seg = out.find((g) => g.n === e.s);
    if (!seg) {
      seg = { n: e.s, title: c.segments.find((s) => s.n === e.s)?.title ?? "", units: [] };
      out.push(seg);
    }
    const key = `${e.k}${e.u}`;
    let unit = seg.units.find((u) => u.key === key);
    if (!unit) {
      unit = { key, kind: e.k, n: e.u, entries: [] };
      seg.units.push(unit);
    }
    unit.entries.push(e);
  }
  for (const seg of out) seg.units.sort((a, b) => (a.kind === b.kind ? a.n - b.n : a.kind === "day" ? -1 : 1));
  return out.sort((a, b) => a.n - b.n);
}

/** ما يراه الأستاذ من حصة: العنوان دائمًا، والملخّص في التجربة، والسير كاملًا للمشترك أو للنماذج. */
export type LessonAccess = { summary: boolean; body: boolean };
export function lessonAccess(access: Access, sample: boolean, staff = false): LessonAccess {
  if (staff || access === "full") return { summary: true, body: true };
  if (access === "trial") return { summary: true, body: sample };
  return { summary: false, body: false };
}

/** معرّف المنهاج لمستوى ومادة (1AP + ar ⇐ 1AP_ar). */
export const curriculumId = (level: string, subject: string) => `${level}_${subject}`;
