/* الدفتر اليومي (دفتر النصوص): سطر لكل حصة من جدول التوقيت، يحمل ما يكتبه
   الأستاذ الجزائري عادة: الميدان/المقطع، الموضوع، مؤشر الكفاءة/الهدف، الوسائل،
   الملاحظات، وحالة الإنجاز. الأسطر الفارغة تُولَّد من الجدول ولا تُحفظ. */

export type LessonStatus = "done" | "partial" | "notDone";

export type LessonEntry = {
  date: string; // YYYY-MM-DD
  classId: string;
  subjectId: string;
  start: string; // HH:MM
  end: string;
  unit: string; // الميدان / المقطع / الوحدة
  title: string; // الموضوع / المحتوى
  objective: string; // مؤشر الكفاءة / الهدف التعلمي
  materials: string; // الوسائل
  notes: string; // الملاحظات
  status: LessonStatus;
};

export const LESSON_TEXT_FIELDS = ["unit", "title", "objective", "materials", "notes"] as const;
export type LessonTextField = (typeof LESSON_TEXT_FIELDS)[number];

export const FIELD_MAX: Record<LessonTextField, number> = { unit: 120, title: 200, objective: 300, materials: 200, notes: 400 };

/** مفتاح ثابت لحصة الدفتر: التاريخ + القسم + المادة + ساعة البداية. */
export function lessonKey(date: string, classId: string, subjectId: string, start: string): string {
  return `${date}_${classId}_${subjectId}_${start.replace(":", "")}`;
}

export function emptyLesson(base: Pick<LessonEntry, "date" | "classId" | "subjectId" | "start" | "end">): LessonEntry {
  return { ...base, unit: "", title: "", objective: "", materials: "", notes: "", status: "done" };
}

export function isBlank(l: Pick<LessonEntry, LessonTextField>): boolean {
  return LESSON_TEXT_FIELDS.every((f) => !l[f].trim());
}

export function cleanLesson(l: LessonEntry): LessonEntry {
  const out = { ...l };
  for (const f of LESSON_TEXT_FIELDS) out[f] = l[f].replace(/[ \t]+/g, " ").trim().slice(0, FIELD_MAX[f]);
  return out;
}

/** أيام أسبوع دراسي يبدأ من الأحد الذي يسبق التاريخ (أو يساويه). */
export function weekDates(iso: string, schoolDays: number[]): string[] {
  const d = new Date(`${iso}T12:00:00Z`);
  const sunday = new Date(d);
  sunday.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return [...schoolDays]
    .sort((a, b) => a - b)
    .map((day) => {
      const x = new Date(sunday);
      x.setUTCDate(sunday.getUTCDate() + day);
      return x.toISOString().slice(0, 10);
    });
}

// ── دفتر التكوين والندوات ─────────────────────────────────────

export type TrainingKind = "seminar" | "trainingDay" | "inspection" | "meeting" | "other";
export const TRAINING_KINDS: TrainingKind[] = ["seminar", "trainingDay", "inspection", "meeting", "other"];

export type TrainingEntry = {
  date: string;
  kind: TrainingKind;
  topic: string; // الموضوع
  supervisor: string; // المؤطر / المفتش
  place: string; // المكان
  notes: string; // الخلاصة / التوصيات
};

export const TRAINING_MAX = { topic: 200, supervisor: 120, place: 120, notes: 1000 } as const;
