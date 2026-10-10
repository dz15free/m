/* التوزيع الشهري (مخطط بناء التعلمات للشهر): أسابيع الشهر الدراسية × مواد القسم، من المذكرات المنشورة،
   مع رزنامة العطل والاختبارات. الترقيم نفسه في كل المنصة (schoolWeekOf): الأسبوع الذي تقع أيامه الدراسية
   كلها في عطلة لا يُعدّ، وأسبوع الاختبارات يبقى أسبوعًا دراسيًا (المذكرات تتركه فارغًا أو للتقويم). */

import { ROW_MAX, type ArColumn, type ProgressionRow } from "./logic.ts";

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

/* ── خانات الجدول ──
   المخطط الشهري منظر شهري لتوزيعات القسم (مادة مادة): التوزيع المحفوظ للأستاذ، وإلا الرسمي من المذكرات.
   تعديل خانة = تعديل أسطر ذلك الأسبوع في توزيع المادة، فيتحدّث «أين أنا الآن؟» معه. */

export const AR_COLUMNS = ["oral", "reading", "writing"] as const;
/** خانة: كل المادة (null)، أو ميدان من العربية، أو «all» لأسبوع عربية بلا ميدان (إدماج…) */
export type CellCol = ArColumn | null;

function member(r: ProgressionRow, col: CellCol): boolean {
  if (col === null || col === "all") return true;
  if (col === "reading") return !r.k || r.k === "reading" || r.k === "all";
  return r.k === col;
}

const distinct = (list: string[]) => [...new Set(list.map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean))];

/** محتوى خانة (الأسبوع n) بلا تكرار، بترتيبه. */
export function cellItems(rows: ProgressionRow[], n: number, col: CellCol): string[] {
  return distinct(rows.filter((r) => r.w === n && member(r, col)).map((r) => r.content));
}

/** أسبوع العربية بخاناته الثلاث، أو خانة واحدة على عرضها حين لا ميدان في أسطره كلها. */
export function arabicWeek(rows: ProgressionRow[], n: number): { merged: string[] | null; cols: Record<(typeof AR_COLUMNS)[number], string[]> } {
  const week = rows.filter((r) => r.w === n);
  if (week.length && week.every((r) => r.k === "all")) return { merged: cellItems(rows, n, "all"), cols: { oral: [], reading: [], writing: [] } };
  return { merged: null, cols: { oral: cellItems(rows, n, "oral"), reading: cellItems(rows, n, "reading"), writing: cellItems(rows, n, "writing") } };
}

/** يستبدل محتوى خانة بعناصر جديدة (سطر لكل عنصر)، في الأسبوع نفسه أو في أسبوع آخر (نقل/تأجيل).
    العنصر الذي لم يتغيّر يحتفظ بعلامة «أُنجز»، والأسطر الجديدة تأخذ مقطع الأسبوع. */
export function replaceCell(rows: ProgressionRow[], n: number, col: CellCol, items: string[], target = n): ProgressionRow[] {
  const isIn = (r: ProgressionRow) => r.w === n && member(r, col);
  const removed = rows.filter(isIn);
  const rest = rows.filter((r) => !isIn(r));
  const doneOf = new Map(removed.map((r) => [r.content, r.done]));
  const unit = removed[0]?.unit ?? rest.find((r) => r.w === target)?.unit ?? rest.filter((r) => r.w <= target).at(-1)?.unit ?? "";
  const fresh: ProgressionRow[] = distinct(items).map((x) => {
    const content = x.slice(0, ROW_MAX.content);
    return { w: target, unit, content, done: doneOf.get(content) ?? false, ...(col ? { k: col } : {}) };
  });
  // الموضع: مكان الخانة نفسها، أو بعد آخر سطر من الأسبوع الهدف
  const firstRemoved = rows.findIndex(isIn);
  const at =
    target === n && firstRemoved >= 0
      ? rows.slice(0, firstRemoved).filter((r) => !isIn(r)).length
      : rest.reduce((last, r, i) => (r.w <= target ? i + 1 : last), 0);
  return [...rest.slice(0, at), ...fresh, ...rest.slice(at)];
}

/** أسطر عربية محفوظة قبل اعتماد الخانات: تأخذ خانة السطر الرسمي المطابق (نفس الأسبوع والموضوع). */
export function inferColumns(rows: ProgressionRow[], official: ProgressionRow[]): ProgressionRow[] {
  const byKey = new Map(official.map((r) => [`${r.w}|${r.content}`, r.k]));
  return rows.map((r) => {
    if (r.k) return r;
    const k = byKey.get(`${r.w}|${r.content}`);
    return k ? { ...r, k } : r;
  });
}

/** لحظة «وضع» توزيع الشهر: أول يوم فيه، الثامنة صباحًا بتوقيت الجزائر (UTC+1) — يبقى «اليوم الأول» في أي منطقة زمنية. */
export function monthPublishedAt(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return Date.UTC(y!, m! - 1, 1, 7);
}
