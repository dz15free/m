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
  /** الحصة من الدرس (مثل «الحصة الأولى: الاكتشاف»)، إن وُجدت */
  ss?: string;
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
  /** أهداف كل نشاط على حدة (الفترة التمهيدية) */
  objectiveParts?: { items: string[] }[];
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

/** أسابيع المنهاج بالترتيب: كل (مقطع، أسبوع) أسبوعٌ، وأيام الفترة التمهيدية تُجمع خمسةً خمسة. */
export function curriculumWeeks(entries: CurriculumEntry[], daysPerWeek = 5): { kind: "day" | "week"; entries: CurriculumEntry[] }[] {
  const out: { kind: "day" | "week"; entries: CurriculumEntry[] }[] = [];
  for (const seg of groupCurriculum({ segments: [], entries })) {
    const days = seg.units.filter((u) => u.kind === "day").flatMap((u) => u.entries);
    for (let i = 0; i < days.length; i += daysPerWeek) out.push({ kind: "day", entries: days.slice(i, i + daysPerWeek) });
    for (const u of seg.units.filter((x) => x.kind === "week")) out.push({ kind: "week", entries: u.entries });
  }
  return out;
}

export type SlotRef = { key: string; date: string; start: string };

/** الحصة المقترحة لكل حصة من الجدول في أسبوع دراسي:
 *  - أسبوع عادي: حصص المادة في الأسبوع بترتيبها (يوم ثم ساعة) ← حصص أسبوع المنهاج بترتيبها.
 *  - الفترة التمهيدية: كل يوم دراسي ← «اليوم» المقابل (كل حصص اليوم لنفس اليوم). */
export function suggestForWeek(
  weeks: { kind: "day" | "week"; entries: CurriculumEntry[] }[],
  weekNo: number,
  slots: SlotRef[],
  schoolDays: number[],
): Map<string, CurriculumEntry> {
  const out = new Map<string, CurriculumEntry>();
  const week = weeks[weekNo - 1];
  if (!week || weekNo < 1) return out;
  const sorted = [...slots].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  if (week.kind === "day") {
    const order = [...schoolDays].sort((a, b) => a - b);
    for (const s of sorted) {
      const idx = order.indexOf(new Date(`${s.date}T12:00:00Z`).getUTCDay());
      const e = week.entries[idx];
      if (e) out.set(s.key, e);
    }
    return out;
  }
  sorted.forEach((s, i) => {
    const e = week.entries[i];
    if (e) out.set(s.key, e);
  });
  return out;
}
