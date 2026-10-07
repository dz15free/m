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
  /** «absolute»: رقم الأسبوع في الحصة هو أسبوع السنة الدراسية نفسه (لا ترقيم داخل المقطع) */
  weekMode?: "absolute";
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

/** أسابيع المنهاج مرتبة بحيث يقابل العنصر n-1 الأسبوع الدراسي n. */
export function weeksOf(c: Pick<Curriculum, "entries" | "weekMode">): { kind: "day" | "week"; entries: CurriculumEntry[] }[] {
  if (c.weekMode !== "absolute") return curriculumWeeks(c.entries);
  const max = Math.max(0, ...c.entries.map((e) => e.u));
  return Array.from({ length: max }, (_, i) => ({ kind: "week" as const, entries: c.entries.filter((e) => e.u === i + 1).sort((a, b) => a.o - b.o) }));
}

export type SlotRef = { key: string; date: string; start: string; /** مدة الحصة في الجدول (للتجميع حسب مدد المذكرات) */ minutes?: number };

/** المدة المكتوبة في المذكرة («30 mn»، «45 min»، «1h30»، «une demi-heure»، «ربع ساعة»…) بالدقائق، أو null. */
export function memoMinutes(text: string | undefined): number | null {
  if (!text) return null;
  const t = text.toLowerCase();
  const hm = /(\d+)\s*h\s*(\d{1,2})?/.exec(t);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2] ?? 0);
  // «1 سا»، «1سا30»، «6سا و30د»
  const sa = /(\d+)\s*سا(?:عة|عات)?(?:\s*و?\s*(\d{1,2})\s*د?)?/.exec(t);
  if (sa) return Number(sa[1]) * 60 + Number(sa[2] ?? 0);
  const m = /(\d+)\s*(?:mn|min|minutes?|د(?:قيقة|قائق)?)(?![a-z\u0621-\u064A])/.exec(t);
  if (m) return Number(m[1]);
  if (/demi[- ]heure|نصف ساعة/.test(t)) return 30;
  if (/quart d.heure|ربع ساعة/.test(t)) return 15;
  if (/ساعة ونصف|une heure et demie/.test(t)) return 90;
  if (/une heure|(?<![\u0621-\u064A])ساعة(?![\u0621-\u064A])/.test(t)) return 60;
  return null;
}

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
  for (const [k, parts] of packWeek(week.entries, sorted)) out.set(k, parts[0]!);
  return out;
}

/** حصص المنهاج لكل حصة من الجدول، بالترتيب. إن حملت المذكرات مددها (مثل «30 mn») تملأ الحصةَ
 *  حصصُ المذكرات المتتالية حتى تكتمل مدتها: حصة ساعة ← نشاطان من 30 دقيقة. وإلا فحصة لحصة. */
export function packWeek(entries: CurriculumEntry[], sortedSlots: SlotRef[]): Map<string, CurriculumEntry[]> {
  const out = new Map<string, CurriculumEntry[]>();
  let i = 0;
  for (const s of sortedSlots) {
    if (i >= entries.length) break;
    const parts = [entries[i++]!];
    let used = memoMinutes(parts[0]!.ss);
    if (used && s.minutes) {
      while (i < entries.length) {
        const d = memoMinutes(entries[i]!.ss);
        if (!d || used + d > s.minutes) break;
        parts.push(entries[i++]!);
        used += d;
      }
    }
    out.set(s.key, parts);
  }
  return out;
}

/** حصص أسبوع مع أجزائها (للأسبوع العادي؛ الفترة التمهيدية حصة واحدة لكل حصة). */
export function suggestPartsForWeek(
  weeks: { kind: "day" | "week"; entries: CurriculumEntry[] }[],
  weekNo: number,
  slots: SlotRef[],
  schoolDays: number[],
): Map<string, CurriculumEntry[]> {
  const week = weeks[weekNo - 1];
  if (!week || weekNo < 1) return new Map();
  if (week.kind === "day") return new Map([...suggestForWeek(weeks, weekNo, slots, schoolDays)].map(([k, e]) => [k, [e]]));
  const sorted = [...slots].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  return packWeek(week.entries, sorted);
}
