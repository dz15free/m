/* جدول التوقيت والحصص الافتراضية — دوال نقية مختبرة.
   الحصص لا تُكتب مسبقًا في القاعدة: تُحسب من الجدول الأسبوعي + الرزنامة.
   المستند يُنشأ فقط عند تسجيل حضور أو درس في حصة فعلية. */

export type Slot = {
  id: string;
  /** 0 = الأحد … 6 = السبت */
  day: number;
  start: string; // "08:00"
  end: string; // "09:00"
  classId: string;
  subjectId: string;
};

export type Calendar = {
  /** أيام الدراسة (الجزائر: الأحد–الخميس) */
  schoolDays: number[];
  /** العطل: مجالات تواريخ شاملة */
  holidays: { start: string; end: string; label?: { ar: string; fr: string } }[];
};

export const DEFAULT_CALENDAR: Calendar = { schoolDays: [0, 1, 2, 3, 4], holidays: [] };

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export const fromMinutes = (min: number) =>
  `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function isValidTime(v: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/** يوم الأسبوع لتاريخ ISO (دون تأثر بمنطقة الجهاز). */
export function weekdayOf(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

export function holidayOf(cal: Calendar, iso: string) {
  return cal.holidays.find((h) => h.start <= iso && iso <= h.end) ?? null;
}

export function isSchoolDay(cal: Calendar, iso: string): boolean {
  return cal.schoolDays.includes(weekdayOf(iso)) && !holidayOf(cal, iso);
}

export const bySlotTime = (a: Slot, b: Slot) => toMinutes(a.start) - toMinutes(b.start) || a.classId.localeCompare(b.classId);

/** حصص يوم معيّن (فارغة في العطل وأيام الراحة). */
export function slotsForDate(slots: Slot[], cal: Calendar, iso: string): Slot[] {
  if (!isSchoolDay(cal, iso)) return [];
  const day = weekdayOf(iso);
  return slots.filter((s) => s.day === day).sort(bySlotTime);
}

/** الحصة الجارية والتالية حسب الدقيقة الحالية. */
export function currentAndNext(daySlots: Slot[], nowMin: number): { current: Slot | null; next: Slot | null } {
  const sorted = [...daySlots].sort(bySlotTime);
  const current = sorted.find((s) => toMinutes(s.start) <= nowMin && nowMin < toMinutes(s.end)) ?? null;
  const next = sorted.find((s) => toMinutes(s.start) > nowMin) ?? null;
  return { current, next };
}

/** «جزء» الحضور لحصة: نصف اليوم لمعلّم القسم، والمادة لأستاذ المادة. */
export function attendancePart(slot: Slot, halfDays: boolean): string {
  if (!halfDays) return slot.subjectId;
  return toMinutes(slot.start) < 12 * 60 ? "am" : "pm";
}

/** تداخل حصتين في اليوم نفسه (تنبيه، لا منع: قد يدرّس الأستاذ فوجين معًا). */
export function overlaps(a: Pick<Slot, "day" | "start" | "end">, b: Pick<Slot, "day" | "start" | "end">): boolean {
  return a.day === b.day && toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

export function newSlotId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}

/** الدقيقة الحالية بتوقيت الجزائر. */
export function nowMinutesInAlgiers(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Algiers", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/** نسخ حصص يوم إلى يوم آخر (بمعرّفات جديدة). */
export function copyDay(slots: Slot[], from: number, to: number): Slot[] {
  const copies = slots.filter((s) => s.day === from).map((s) => ({ ...s, id: newSlotId(), day: to }));
  return [...slots.filter((s) => s.day !== to), ...copies];
}
