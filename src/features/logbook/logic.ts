/* الدفتر اليومي: سطر لكل حصة من جدول التوقيت بأعمدة الدفتر الجزائري
   (المدة، النشاط، الميدان، المحتوى، مركبات الكفاءة / الهدف التعلمي) موزّعة
   على الفترتين الصباحية والمسائية. الأسطر الفارغة تُولَّد من الجدول ولا تُحفظ. */

export type LessonStatus = "done" | "partial" | "notDone";

export type LessonEntry = {
  date: string; // YYYY-MM-DD
  classId: string;
  subjectId: string;
  start: string; // HH:MM
  end: string;
  activity: string; // النشاط (قراءة، تعبير شفوي، …)
  unit: string; // الميدان
  title: string; // المحتوى
  objective: string; // مركبات الكفاءة / الهدف التعلمي
  materials: string; // الوسائل
  notes: string; // الملاحظات
  status: LessonStatus;
  /** المقطع / الأسبوع / الحصة (أعمدة الدفتر الرسمي) — اختيارية */
  seq?: string;
  week?: string;
  session?: string;
  /** المذكرة الجاهزة المصدر (lessonSummaries/<ref>) */
  ref?: string;
};

export const LESSON_META_FIELDS = ["seq", "week", "session"] as const;
export const META_MAX = { seq: 80, week: 20, session: 20, ref: 40 } as const;

export const LESSON_TEXT_FIELDS = ["activity", "unit", "title", "objective", "materials", "notes"] as const;
export type LessonTextField = (typeof LESSON_TEXT_FIELDS)[number];

export const FIELD_MAX: Record<LessonTextField, number> = { activity: 120, unit: 120, title: 200, objective: 300, materials: 200, notes: 400 };

/** مفتاح ثابت لحصة الدفتر: التاريخ + القسم + المادة + ساعة البداية. */
export function lessonKey(date: string, classId: string, subjectId: string, start: string): string {
  return `${date}_${classId}_${subjectId}_${start.replace(":", "")}`;
}

export function emptyLesson(base: Pick<LessonEntry, "date" | "classId" | "subjectId" | "start" | "end">): LessonEntry {
  return { ...base, activity: "", unit: "", title: "", objective: "", materials: "", notes: "", status: "done" };
}

export function isBlank(l: Pick<LessonEntry, LessonTextField>): boolean {
  return LESSON_TEXT_FIELDS.every((f) => !l[f]?.trim());
}

export function cleanLesson(l: LessonEntry): LessonEntry {
  const out = { ...l };
  for (const f of LESSON_TEXT_FIELDS) out[f] = (l[f] ?? "").replace(/[ \t]+/g, " ").trim().slice(0, FIELD_MAX[f]);
  for (const f of [...LESSON_META_FIELDS, "ref"] as const) {
    const v = (l[f] ?? "").replace(/\s+/g, " ").trim().slice(0, META_MAX[f]);
    if (v) out[f] = v;
    else delete out[f];
  }
  return out;
}

/** مدة الحصة بالدقائق. */
export function durationMinutes(start: string, end: string): number {
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return Math.max(0, m(end) - m(start));
}

/** المدة المكتوبة في المذكرة («30 mn»، «45 min»، «1h30»، «une demi-heure»، «ربع ساعة»…) بالدقائق، أو null. */
export function memoMinutes(text: string | undefined): number | null {
  if (!text) return null;
  const t = text.toLowerCase();
  const hm = /(\d+)\s*h\s*(\d{1,2})?/.exec(t);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2] ?? 0);
  const m = /(\d+)\s*(?:mn|min|minutes?|د(?:قيقة|قائق)?)(?![a-z\u0621-\u064A])/.exec(t);
  if (m) return Number(m[1]);
  if (/demi[- ]heure|نصف ساعة/.test(t)) return 30;
  if (/quart d.heure|ربع ساعة/.test(t)) return 15;
  if (/ساعة ونصف|une heure et demie/.test(t)) return 90;
  if (/une heure|(?<![\u0621-\u064A])ساعة(?![\u0621-\u064A])/.test(t)) return 60;
  return null;
}

/** الفترة الصباحية تنتهي قبل منتصف النهار؛ ما بدأ بعده فمسائي. */
export const periodOf = (start: string): "am" | "pm" => (start < "12:00" ? "am" : "pm");

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

// ── دفتر التحضير (المذكرات) ─────────────────────────────────
// مذكّرة درس بمراحله الثلاث؛ مستقلة عن التاريخ لتُعاد في السنوات التالية.

export const PREP_PHASES = ["launch", "build", "invest"] as const;
export type PrepPhase = (typeof PREP_PHASES)[number];

export type PrepEntry = {
  subjectId: string;
  gradeId: string; // المستوى
  domain: string; // الميدان
  sequence: string; // المقطع
  activity: string; // النشاط
  week: string; // الأسبوع
  content: string; // المحتوى
  session: string; // الحصة
  objective: string; // الهدف التعلمي
  values: string; // القيم
  materials: string; // الوسائل
  phases: Record<PrepPhase, { situation: string; assessment: string }>;
  date: string; // آخر تاريخ إنجاز (اختياري)
};

export const PREP_HEAD_FIELDS = ["domain", "sequence", "activity", "week", "content", "session"] as const;
export const PREP_BODY_FIELDS = ["objective", "values", "materials"] as const;
export const PREP_MAX = {
  domain: 120, sequence: 120, activity: 120, week: 20, content: 200, session: 20,
  objective: 500, values: 300, materials: 300, situation: 4000, assessment: 1500,
} as const;

export function emptyPrep(subjectId = "", gradeId = ""): PrepEntry {
  const phase = () => ({ situation: "", assessment: "" });
  return {
    subjectId, gradeId, domain: "", sequence: "", activity: "", week: "", content: "", session: "",
    objective: "", values: "", materials: "", phases: { launch: phase(), build: phase(), invest: phase() }, date: "",
  };
}

export function cleanPrep(p: PrepEntry): PrepEntry {
  const line = (v: string, max: number) => (v ?? "").replace(/[ \t]+/g, " ").trim().slice(0, max);
  const block = (v: string, max: number) => (v ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
  const out = { ...p, phases: { ...p.phases } };
  for (const f of PREP_HEAD_FIELDS) out[f] = line(p[f], PREP_MAX[f]);
  for (const f of PREP_BODY_FIELDS) out[f] = block(p[f], PREP_MAX[f]);
  for (const ph of PREP_PHASES) {
    out.phases[ph] = {
      situation: block(p.phases?.[ph]?.situation, PREP_MAX.situation),
      assessment: block(p.phases?.[ph]?.assessment, PREP_MAX.assessment),
    };
  }
  return out;
}

/** عنوان مختصر للمذكرة في القوائم. */
export const prepTitle = (p: Pick<PrepEntry, "activity" | "content">) => [p.activity, p.content].filter(Boolean).join(": ");
