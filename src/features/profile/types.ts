import type { Stage } from "@/shared/dz/education";

/** كيف يدرّس الأستاذ — يحدّد شكل إنشاء الأقسام لاحقًا (Phase 4). */
export type PresetType = "primaryGeneralist" | "primarySubject" | "middleSecondary";

/** الملف المهني: يُكتب مرة واحدة ويُعاد استعماله في كل الوثائق. */
export type TeacherProfile = {
  firstName: string;
  lastName: string;
  stage: Stage;
  gradeId: string;
  gradeCustom?: string;
  wilayaCode: number;
  directorate: string;
  presetType: PresetType;
  activeYearId: string;
  primarySchoolId: string;
};

export type School = {
  name: string;
  wilayaCode: number;
  commune: string;
  stage: Stage;
  directorate: string;
};

export type OnboardingInput = {
  profile: Omit<TeacherProfile, "activeYearId" | "primarySchoolId">;
  school: School;
  year: { id: string; label: string };
};

/** مديرية التربية المقترحة افتراضيًا (قابلة للتعديل: بعض الولايات فيها أكثر من مديرية). */
export function defaultDirectorate(wilayaName: string, locale: "ar" | "fr"): string {
  if (!wilayaName) return "";
  return locale === "fr" ? `Direction de l'éducation de ${wilayaName}` : `مديرية التربية لولاية ${wilayaName}`;
}
