"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTeacher } from "@/features/classes/hooks";
import { gradeLabel } from "@/shared/dz/education";
import { parseAcademicYearId } from "@/shared/academic-year";
import { DOC, docDirectorate, type DocLang } from "@/i18n/doc-lang";
import type { Locale } from "@/i18n/config";

/* رأس الوثائق المطبوعة: بيانات الأستاذ والمؤسسة تُكتب تلقائيًا من الملف المهني.
   وثائق الفرنسية والإنجليزية (lang) برأس رسمي بلغتها، من اليسار. */
export function PrintHeader({ title, subtitle, lang, level, official = false }: { title: string; subtitle?: string; lang?: DocLang | null; level?: string; official?: boolean }) {
  const t = useTranslations("logbook.print");
  const locale = useLocale() as Locale;
  const teacher = useTeacher().data;
  if (!teacher) return null;
  const { profile, school } = teacher;
  const year = parseAcademicYearId(profile.activeYearId)?.label;

  if (lang) {
    const L = DOC[lang];
    return (
      <header dir="ltr" lang={lang} className="mb-4 border-b-2 border-ink pb-3 text-[11pt]">
        <div className="text-center font-semibold">
          <p>{L.republic}</p>
          <p>{L.ministry}</p>
        </div>
        <div className="mt-2 flex justify-between gap-6">
          <div className="space-y-0.5">
            <p><b>{L.teacher}:</b> {profile.lastName} {profile.firstName}</p>
            <p><b>{L.school}:</b> <bdi>{school?.name}</bdi></p>
            {level && <p><b>{L.level}:</b> {level}</p>}
            <p><b>{L.year}:</b> {year}</p>
          </div>
          <p className="text-end">{docDirectorate(school?.wilayaCode ?? profile.wilayaCode, lang, school?.directorate ?? profile.directorate)}</p>
        </div>
        <h1 className="mt-3 text-center text-[16pt] font-bold">{title}</h1>
        {subtitle && <p className="text-center">{subtitle}</p>}
      </header>
    );
  }

  const grade = gradeLabel(profile.stage, profile.gradeId, profile.gradeCustom, locale);
  return (
    <header className="mb-4 border-b-2 border-ink pb-3 text-[11pt]">
      {/* الوثائق الرسمية (التوزيعات): الجمهورية والوزارة في الأعلى */}
      {official && (
        <div className="mb-2 text-center font-semibold">
          <p>{t("republic")}</p>
          <p>{t("ministry")}</p>
        </div>
      )}
      <div className="flex justify-between gap-6">
        <div className="space-y-0.5">
          <p>{school?.directorate ?? profile.directorate}</p>
          <p>{t("school")}: {school?.name}</p>
        </div>
        <div className="space-y-0.5 text-end">
          <p>{t("teacher")}: {profile.lastName} {profile.firstName}{grade ? ` — ${grade}` : ""}</p>
          <p>{t("year")}: <bdi dir="ltr">{year}</bdi></p>
        </div>
      </div>
      <h1 className="mt-3 text-center text-[16pt] font-bold">{title}</h1>
      {subtitle && <p className="text-center">{subtitle}</p>}
    </header>
  );
}
