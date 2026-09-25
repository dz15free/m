"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTeacher } from "@/features/classes/hooks";
import { gradeLabel } from "@/shared/dz/education";
import { parseAcademicYearId } from "@/shared/academic-year";

/* رأس الوثائق المطبوعة: بيانات الأستاذ والمؤسسة تُكتب تلقائيًا من الملف المهني. */
export function PrintHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const t = useTranslations("logbook.print");
  const locale = useLocale() as "ar" | "fr";
  const teacher = useTeacher().data;
  if (!teacher) return null;
  const { profile, school } = teacher;
  const grade = gradeLabel(profile.stage, profile.gradeId, profile.gradeCustom, locale);

  return (
    <header className="mb-4 border-b-2 border-ink pb-3 text-[11pt]">
      <div className="flex justify-between gap-6">
        <div className="space-y-0.5">
          <p>{school?.directorate ?? profile.directorate}</p>
          <p>{t("school")}: {school?.name}</p>
        </div>
        <div className="space-y-0.5 text-end">
          <p>{t("teacher")}: {profile.lastName} {profile.firstName}{grade ? ` — ${grade}` : ""}</p>
          <p>{t("year")}: <bdi dir="ltr">{parseAcademicYearId(profile.activeYearId)?.label}</bdi></p>
        </div>
      </div>
      <h1 className="mt-3 text-center text-[16pt] font-bold">{title}</h1>
      {subtitle && <p className="text-center">{subtitle}</p>}
    </header>
  );
}
