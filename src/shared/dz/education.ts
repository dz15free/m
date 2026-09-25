/* الأطوار والرتب. بيانات مرجعية بسيطة للواجهة؛ المستويات والمواد (taxonomy)
   تُدار من لوحة الإدارة في قاعدة البيانات وتصل في Phase 4. */
export const STAGES = ["primary", "middle", "secondary"] as const;
export type Stage = (typeof STAGES)[number];

export type Grade = { id: string; ar: string; fr: string };

/* الرتب الشائعة لكل طور. «أخرى» تسمح بكتابة الرتبة يدويًا. */
export const GRADES: Record<Stage, readonly Grade[]> = {
  primary: [
    { id: "p_teacher", ar: "أستاذ المدرسة الابتدائية", fr: "Professeur de l'école primaire" },
    { id: "p_principal", ar: "أستاذ رئيسي للمدرسة الابتدائية", fr: "Professeur principal de l'école primaire" },
    { id: "p_trainer", ar: "أستاذ مكوّن في المدرسة الابتدائية", fr: "Professeur formateur de l'école primaire" },
  ],
  middle: [
    { id: "m_teacher", ar: "أستاذ التعليم المتوسط", fr: "Professeur de l'enseignement moyen" },
    { id: "m_principal", ar: "أستاذ رئيسي للتعليم المتوسط", fr: "Professeur principal de l'enseignement moyen" },
    { id: "m_trainer", ar: "أستاذ مكوّن في التعليم المتوسط", fr: "Professeur formateur de l'enseignement moyen" },
  ],
  secondary: [
    { id: "s_teacher", ar: "أستاذ التعليم الثانوي", fr: "Professeur de l'enseignement secondaire" },
    { id: "s_principal", ar: "أستاذ رئيسي للتعليم الثانوي", fr: "Professeur principal de l'enseignement secondaire" },
    { id: "s_trainer", ar: "أستاذ مكوّن في التعليم الثانوي", fr: "Professeur formateur de l'enseignement secondaire" },
  ],
};

/* رتب مشتركة بين الأطوار */
export const COMMON_GRADES: readonly Grade[] = [
  { id: "contract", ar: "أستاذ متعاقد", fr: "Professeur contractuel" },
  { id: "substitute", ar: "أستاذ مستخلف", fr: "Professeur suppléant" },
];

export function gradesFor(stage: Stage): Grade[] {
  return [...GRADES[stage], ...COMMON_GRADES];
}

/** نصّ الرتبة المعروض في الوثائق: رتبة من القائمة، أو ما كتبه الأستاذ. */
export function gradeLabel(stage: Stage, gradeId: string, custom: string | undefined, locale: "ar" | "fr"): string {
  if (gradeId === "other") return custom ?? "";
  return gradesFor(stage).find((g) => g.id === gradeId)?.[locale] ?? "";
}
