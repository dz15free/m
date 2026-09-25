/* التوزيع السنوي و«أين أنا الآن؟».
   الأسابيع الدراسية تُعدّ من تاريخ الانطلاق، والأسبوع الواقع كله في عطلة لا يُحسب. */

export type ProgressionRow = { w: number; unit: string; content: string; done: boolean };
export type Progression = { classId: string; subjectId: string; startDate: string; rows: ProgressionRow[] };
export type Holiday = { start: string; end: string };

export const MAX_ROWS = 200;
export const ROW_MAX = { unit: 120, content: 300 } as const;

const DAY = 86_400_000;
const toTime = (iso: string) => Date.parse(`${iso}T12:00:00Z`);
const toIso = (t: number) => new Date(t).toISOString().slice(0, 10);

export const progressionId = (classId: string, subjectId: string) => `${classId}__${subjectId}`;

/** أحد الأسبوع الذي يضم 21 سبتمبر من سنة الانطلاق — اقتراح قابل للتعديل. */
export function defaultStart(startYear: number): string {
  const t = toTime(`${startYear}-09-21`);
  return toIso(t - new Date(t).getUTCDay() * DAY);
}

function weekIsHoliday(sunday: number, schoolDays: number[], holidays: Holiday[]): boolean {
  return schoolDays.every((d) => {
    const iso = toIso(sunday + d * DAY);
    return holidays.some((h) => h.start <= iso && iso <= h.end);
  });
}

/** رقم الأسبوع الدراسي لتاريخ (1 = أسبوع الانطلاق)، أو 0 قبل الانطلاق. */
export function schoolWeekOf(date: string, start: string, schoolDays: number[], holidays: Holiday[]): number {
  const s = toTime(start);
  const firstSunday = s - new Date(s).getUTCDay() * DAY;
  const t = toTime(date);
  if (t < firstSunday) return 0;
  let n = 0;
  for (let w = firstSunday; w <= t; w += 7 * DAY) if (!weekIsHoliday(w, schoolDays, holidays)) n++;
  // يوم داخل عطلة: نبقى على آخر أسبوع دراسي
  return n;
}

/** أحد الأسبوع الدراسي رقم n (لعرض التواريخ والتجميع الشهري). */
export function weekStart(n: number, start: string, schoolDays: number[], holidays: Holiday[]): string {
  const s = toTime(start);
  let w = s - new Date(s).getUTCDay() * DAY;
  let count = 0;
  for (let guard = 0; guard < 80; guard++, w += 7 * DAY) {
    if (!weekIsHoliday(w, schoolDays, holidays)) count++;
    if (count === n) return toIso(w);
  }
  return toIso(w);
}

export type Status = { kind: "empty" | "done" | "late" | "onTrack" | "ahead"; weeks: number; nextRow: ProgressionRow | null; doneCount: number; total: number };

/** أين أنا الآن؟ نقارن أول سطر لم يُنجز بالأسبوع الجاري. */
export function progressStatus(rows: ProgressionRow[], currentWeek: number): Status {
  const sorted = [...rows].sort((a, b) => a.w - b.w);
  const doneCount = sorted.filter((r) => r.done).length;
  const base = { doneCount, total: sorted.length };
  if (!sorted.length) return { kind: "empty", weeks: 0, nextRow: null, ...base };
  const next = sorted.find((r) => !r.done) ?? null;
  if (!next) return { kind: "done", weeks: 0, nextRow: null, ...base };
  const diff = currentWeek - next.w;
  if (diff > 0) return { kind: "late", weeks: diff, nextRow: next, ...base };
  if (diff < 0) return { kind: "ahead", weeks: -diff, nextRow: next, ...base };
  return { kind: "onTrack", weeks: 0, nextRow: next, ...base };
}

/** لصق توزيع جاهز: سطر لكل موضوع. «رقم الأسبوع | الوحدة | المحتوى» أو بفواصل جدولة،
    أو المحتوى وحده (يُعطى الأسبوع التالي). */
export function parseProgression(text: string): ProgressionRow[] {
  const rows: ProgressionRow[] = [];
  let week = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    let cells = line.split(/\t|\s\|\s|\|/).map((c) => c.trim()).filter(Boolean);
    const m = /^(?:الأسبوع|الاسبوع|أسبوع|semaine|sem\.?|s)?\s*(\d{1,2})\s*[:\-–.)]?\s*(.*)$/i.exec(cells[0] ?? "");
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= 40 && (cells.length > 1 || m[2])) {
      week = Number(m[1]);
      cells = m[2] ? [m[2], ...cells.slice(1)] : cells.slice(1);
    } else {
      week = week + 1 || 1;
    }
    if (!cells.length) continue;
    const [unit, ...rest] = cells.length > 1 ? cells : ["", ...cells];
    rows.push({ w: week, unit: (unit ?? "").slice(0, ROW_MAX.unit), content: rest.join(" — ").slice(0, ROW_MAX.content), done: false });
    if (rows.length >= MAX_ROWS) break;
  }
  return rows;
}
