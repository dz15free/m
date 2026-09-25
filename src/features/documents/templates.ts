/* قائمة الوثائق الجاهزة (مشتركة بين صفحات الخادم ومكوّن البناء). */
export const TEMPLATES = ["certificates", "absences", "convocation", "classSign", "nameCards"] as const;
export type TemplateId = (typeof TEMPLATES)[number];
