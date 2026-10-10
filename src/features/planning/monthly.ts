/* التوزيع الشهري (مخطط بناء التعلمات للشهر): أسابيع الشهر الدراسية × مواد القسم، من المذكرات المنشورة،
   مع رزنامة العطل والاختبارات. الترقيم نفسه في كل المنصة (schoolWeekOf): الأسبوع الذي تقع أيامه الدراسية
   كلها في عطلة لا يُعدّ، وأسبوع الاختبارات يبقى أسبوعًا دراسيًا (المذكرات تتركه فارغًا أو للتقويم). */

import { weeksOf, type Curriculum, type CurriculumEntry } from "../lessons/logic.ts";

type Label = { ar: string; fr: string };
export type MonthCalendar = {
  schoolDays: number[];
  holidays: { start: string; end: string; label?: Label }[];
  exams?: { term: 1 | 2 | 3; days: string[] }[];
};

export type MonthWeek = {
  /** رقم الأسبوع الدراسي في السنة (= أسبوع المذكرات) */
  n: number;
  /** ترتيبه في الشهر (1، 2، …) */
  index: number;
  /** الأيام الدراسية الفعلية (بلا عطل) */
  days: string[];
  /** فصل الاختبارات وأيامه في هذا الأسبوع */
  exams: { term: 1 | 2 | 3; days: string[] }[];
  /** عطلة تبدأ أو تنتهي داخل هذا الأسبوع */
  holidays: { label?: Label; start: string; end: string }[];
};

const DAY = 86_400_000;
const toTime = (iso: string) => Date.parse(`${iso}T12:00:00Z`);
const toIso = (t: number) => new Date(t).toISOString().slice(0, 10);
/** أطول سنة: من الانطلاق حتى جويلية */
const MAX_WEEKS = 46;

/** كل أسابيع السنة الدراسية مع شهر كلٍّ منها (الشهر الذي يضم أغلب أيامه الدراسية، والأسبق عند التساوي). */
export function yearWeeks(start: string, cal: MonthCalendar): (Omit<MonthWeek, "index"> & { month: string })[] {
  const s = toTime(start);
  const firstSunday = s - new Date(s).getUTCDay() * DAY;
  const inHoliday = (iso: string) => cal.holidays.find((h) => h.start <= iso && iso <= h.end);
  const out: (Omit<MonthWeek, "index"> & { month: string })[] = [];
  for (let i = 0; i < MAX_WEEKS; i++) {
    const sunday = firstSunday + i * 7 * DAY;
    const all = [...cal.schoolDays].sort((a, b) => a - b).map((d) => toIso(sunday + d * DAY));
    const days = all.filter((iso) => !inHoliday(iso));
    if (!days.length) continue;
    const count = new Map<string, number>();
    for (const d of days) count.set(d.slice(0, 7), (count.get(d.slice(0, 7)) ?? 0) + 1);
    const month = [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]![0];
    const exams = (cal.exams ?? []).map((e) => ({ term: e.term, days: e.days.filter((d) => all.includes(d)) })).filter((e) => e.days.length);
    const holidays = cal.holidays.filter((h) => all.some((d) => h.start <= d && d <= h.end)).map((h) => ({ label: h.label, start: h.start, end: h.end }));
    out.push({ n: out.length + 1, days, exams, holidays, month });
  }
  return out;
}

/** أشهر السنة الدراسية بالترتيب («2026-10»…): حتى شهر آخر اختبار إن عُرفت الاختبارات، وإلا حتى جوان. */
export function schoolMonths(start: string, cal: MonthCalendar): string[] {
  const lastExam = (cal.exams ?? []).flatMap((e) => e.days).sort().at(-1);
  const end = lastExam ? lastExam.slice(0, 7) : `${Number(start.slice(0, 4)) + 1}-06`;
  return [...new Set(yearWeeks(start, cal).map((w) => w.month))].filter((m) => m <= end);
}

export function monthWeeks(month: string, start: string, cal: MonthCalendar): MonthWeek[] {
  return yearWeeks(start, cal)
    .filter((w) => w.month === month)
    .map((w, i) => ({ n: w.n, index: i + 1, days: w.days, exams: w.exams, holidays: w.holidays }));
}

/** حصص المذكرات لأسبوع دراسي. */
export function entriesOfWeek(c: Pick<Curriculum, "entries" | "weekMode"> | null | undefined, n: number): CurriculumEntry[] {
  if (!c?.entries.length) return [];
  return weeksOf(c)[n - 1]?.entries ?? [];
}

/** المواضيع المختلفة بترتيبها (بلا تكرار الحصص المتعددة لنفس الموضوع). */
export function topicsOf(entries: CurriculumEntry[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of [...entries].sort((a, b) => a.o - b.o)) {
    const t = e.t.replace(/\s+/g, " ").trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

export const AR_COLUMNS = ["oral", "reading", "writing"] as const;
export type ArColumn = (typeof AR_COLUMNS)[number];

/** اللغة العربية بميادينها الثلاثة كما في المخطط الرسمي: فهم المنطوق والتعبير الشفوي، فهم المكتوب، التعبير الكتابي.
    أسبوع لا ميدان فيه (إدماج، تقويم، تثبيت المكتسبات) يُعرض خانة واحدة على عرض الميادين. */
export function arabicColumns(entries: CurriculumEntry[]): { merged: string[] | null; cols: Record<ArColumn, string[]> } {
  const kind = (d: string): ArColumn | null =>
    /المنطوق|الشفوي/.test(d) ? "oral" : /الكتابي|الكتابة|التخطيط/.test(d) ? "writing" : /المكتوب|القراءة|المحفوظات/.test(d) ? "reading" : null;
  const groups: Record<ArColumn, CurriculumEntry[]> = { oral: [], reading: [], writing: [] };
  const other: CurriculumEntry[] = [];
  for (const e of entries) {
    const k = kind(e.d);
    (k ? groups[k] : other).push(e);
  }
  if (!groups.oral.length && !groups.reading.length && !groups.writing.length) {
    return { merged: other.length ? topicsOf(other) : null, cols: { oral: [], reading: [], writing: [] } };
  }
  groups.reading.push(...other);
  return { merged: null, cols: { oral: topicsOf(groups.oral), reading: topicsOf(groups.reading), writing: topicsOf(groups.writing) } };
}

/** لحظة «وضع» توزيع الشهر: أول يوم فيه، الثامنة صباحًا بتوقيت الجزائر (UTC+1) — يبقى «اليوم الأول» في أي منطقة زمنية. */
export function monthPublishedAt(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return Date.UTC(y!, m! - 1, 1, 7);
}
