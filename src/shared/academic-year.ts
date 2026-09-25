/* السنة الدراسية تُحسب من التاريخ ولا تُكتب في الكود.
   الدخول المدرسي في الجزائر في سبتمبر، والتسجيل المبكر يبدأ أواخر أوت،
   فمن أوت تُقترح السنة الجديدة. تفاصيل الرزنامة (الفصول والعطل) يضبطها
   الأدمن في `academicYears/{id}` بنفس المعرّف. */

export type AcademicYearRef = {
  /** معرّف ثابت صالح كمفتاح Firestore، مثل "2026-2027" */
  id: string;
  /** للعرض، مثل "2026/2027" */
  label: string;
  startYear: number;
};

/** أول شهر يُقترح فيه العام الجديد (0 = جانفي، 7 = أوت). */
const ROLLOVER_MONTH = 7;

export function academicYearFor(date: Date): AcademicYearRef {
  const startYear = date.getMonth() >= ROLLOVER_MONTH ? date.getFullYear() : date.getFullYear() - 1;
  return fromStartYear(startYear);
}

export function fromStartYear(startYear: number): AcademicYearRef {
  return { id: `${startYear}-${startYear + 1}`, label: `${startYear}/${startYear + 1}`, startYear };
}

export function parseAcademicYearId(id: string): AcademicYearRef | null {
  const match = /^(\d{4})-(\d{4})$/.exec(id);
  if (!match) return null;
  const start = Number(match[1]);
  if (Number(match[2]) !== start + 1) return null;
  return fromStartYear(start);
}
