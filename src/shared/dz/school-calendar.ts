/* الرزنامة الرسمية لوزارة التربية الوطنية (العطل والاختبارات الفصلية للابتدائي).
   تُستعمل حين لا يضبط الأدمن عطل السنة في `academicYears/{id}`.
   العطلة «من مساء يوم إلى صباح يوم» ⇐ الأيام المعطّلة من اليوم التالي للأول إلى اليوم السابق للثاني. */

export type Label = { ar: string; fr: string };
export type Holiday = { start: string; end: string; label?: Label };
/** أيام اختبارات فصل (قد لا تكون متتالية: الفصل الثاني 2، 3، 4، 7، 8 مارس) */
export type ExamPeriod = { term: 1 | 2 | 3; days: string[] };

export const HOLIDAY_LABELS = {
  autumn: { ar: "عطلة الخريف", fr: "Vacances d'automne" },
  winter: { ar: "عطلة الشتاء", fr: "Vacances d'hiver" },
  spring: { ar: "عطلة الربيع", fr: "Vacances de printemps" },
} as const satisfies Record<string, Label>;

const range = (from: string, to: string): string[] => {
  const out: string[] = [];
  for (let t = Date.parse(`${from}T12:00:00Z`); t <= Date.parse(`${to}T12:00:00Z`); t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
};

/** بلاغ الوزارة رقم 03 المؤرخ في 05 أكتوبر 2026 (تنفيذًا للقرار رقم 41 المؤرخ في 28 سبتمبر 2026). */
const OFFICIAL: Record<string, { holidays: Holiday[]; exams: ExamPeriod[] }> = {
  "2026-2027": {
    holidays: [
      // من مساء الثلاثاء 27 أكتوبر إلى صباح الاثنين 02 نوفمبر 2026
      { start: "2026-10-28", end: "2026-11-01", label: HOLIDAY_LABELS.autumn },
      // من مساء الخميس 17 ديسمبر 2026 إلى صباح الأحد 03 جانفي 2027
      { start: "2026-12-18", end: "2027-01-02", label: HOLIDAY_LABELS.winter },
      // من مساء الخميس 18 مارس إلى صباح الأحد 04 أفريل 2027
      { start: "2027-03-19", end: "2027-04-03", label: HOLIDAY_LABELS.spring },
    ],
    exams: [
      { term: 1, days: range("2026-12-06", "2026-12-10") },
      { term: 2, days: ["2027-03-02", "2027-03-03", "2027-03-04", "2027-03-07", "2027-03-08"] },
      { term: 3, days: range("2027-05-23", "2027-05-27") },
    ],
  },
};

export function officialCalendar(yearId: string): { holidays: Holiday[]; exams: ExamPeriod[] } | null {
  return OFFICIAL[yearId] ?? null;
}
