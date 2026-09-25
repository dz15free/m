/* منطق الحضور — دوال نقية مختبرة.
   نخزّن الاستثناءات فقط: التلميذ غير المذكور في الخريطة «حاضر».
   قسم من 35 تلميذًا مع غائبين = حقلان فقط، وكتابة واحدة للحصة. */

export type Mark = "A" | "L" | "E"; // غائب، متأخر، غياب بعذر
export type Status = "P" | Mark; // P = حاضر (لا يُخزَّن)
export type AttendanceMap = Record<string, Mark>;
export type Counts = { p: number; a: number; l: number; e: number };

/** ترتيب التدوير عند النقر على اسم التلميذ. */
const CYCLE: Status[] = ["P", "A", "L", "E"];

export function nextStatus(s: Status): Status {
  return CYCLE[(CYCLE.indexOf(s) + 1) % CYCLE.length]!;
}

export function statusOf(map: AttendanceMap, studentId: string): Status {
  return map[studentId] ?? "P";
}

export function setStatus(map: AttendanceMap, studentId: string, status: Status): AttendanceMap {
  const next = { ...map };
  if (status === "P") delete next[studentId];
  else next[studentId] = status;
  return next;
}

/** يحسب العدّ للتلاميذ الحاليين فقط (تلميذ نُقل أو حُذف لا يُحسب). */
export function countMarks(studentIds: readonly string[], map: AttendanceMap): Counts {
  const c: Counts = { p: 0, a: 0, l: 0, e: 0 };
  for (const id of studentIds) {
    const m = map[id];
    if (m === "A") c.a++;
    else if (m === "L") c.l++;
    else if (m === "E") c.e++;
    else c.p++;
  }
  return c;
}

/** يُبقي في الخريطة التلاميذ الموجودين فقط. */
export function pruneMap(map: AttendanceMap, studentIds: readonly string[]): AttendanceMap {
  const ids = new Set(studentIds);
  return Object.fromEntries(Object.entries(map).filter(([id]) => ids.has(id)));
}

// ── مفاتيح الحصص ─────────────────────────────────────────────

/** «جزء» الحصة: نصف يوم لمعلّم القسم (am/pm)، أو مادة، أو لاحقًا خانة جدول التوقيت. */
export function sessionKey(date: string, classId: string, part: string): string {
  return `${date}_${classId}_${part}`;
}

export function isIsoDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
}

/** تاريخ اليوم بتوقيت الجزائر بصيغة YYYY-MM-DD. */
export function todayInAlgiers(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Algiers" }).format(now);
}

export function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const monthOf = (iso: string) => iso.slice(0, 7);

// ── الإحصائيات التراكمية ──────────────────────────────────────

/** تغيّر الإحصائيات بين نسختين من حصة واحدة، لتُضاف بـ increment (بلا إعادة قراءة كل الحصص). */
export type StatsDelta = {
  students: Record<string, Partial<Record<"a" | "l" | "e", number>>>;
  month: { sessions: number; seats: number; a: number; l: number; e: number };
};

const key = { A: "a", L: "l", E: "e" } as const;

export function statsDelta(
  prev: { map: AttendanceMap; rosterSize: number } | null,
  next: { map: AttendanceMap; rosterSize: number },
): StatsDelta {
  const students: StatsDelta["students"] = {};
  const month = { sessions: prev ? 0 : 1, seats: next.rosterSize - (prev?.rosterSize ?? 0), a: 0, l: 0, e: 0 };
  const bump = (id: string, m: Mark, by: number) => {
    const k = key[m];
    students[id] = { ...students[id], [k]: (students[id]?.[k] ?? 0) + by };
    month[k] += by;
  };
  for (const [id, m] of Object.entries(prev?.map ?? {})) bump(id, m, -1);
  for (const [id, m] of Object.entries(next.map)) bump(id, m, +1);
  // حذف الأصفار
  for (const id of Object.keys(students)) {
    for (const k of ["a", "l", "e"] as const) if (students[id]![k] === 0) delete students[id]![k];
    if (Object.keys(students[id]!).length === 0) delete students[id];
  }
  return { students, month };
}

export type ClassStats = {
  sessions: number;
  s: Record<string, { a?: number; l?: number; e?: number }>;
  m: Record<string, { sessions?: number; seats?: number; a?: number; l?: number; e?: number }>;
};

/** نسبة الحضور = 1 − (الغيابات بعذر وبدونه) ÷ المقاعد. المتأخر يُعدّ حاضرًا. */
export function attendanceRate(m: { seats?: number; a?: number; e?: number }): number | null {
  if (!m.seats) return null;
  return Math.max(0, 1 - ((m.a ?? 0) + (m.e ?? 0)) / m.seats);
}

export function totals(stats: ClassStats) {
  const t = { sessions: 0, seats: 0, a: 0, l: 0, e: 0 };
  for (const m of Object.values(stats.m ?? {})) {
    t.sessions += m.sessions ?? 0;
    t.seats += m.seats ?? 0;
    t.a += m.a ?? 0;
    t.l += m.l ?? 0;
    t.e += m.e ?? 0;
  }
  return t;
}
