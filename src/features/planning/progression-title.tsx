"use client";

import { useLocale } from "next-intl";
import { useClass, useTaxonomy, useTeacher } from "@/features/classes/hooks";
import { subjectById } from "@/shared/taxonomy/taxonomy";

export function ProgressionTitle({ classId, subjectId }: { classId: string; subjectId: string }) {
  const locale = useLocale() as "ar" | "fr";
  const teacher = useTeacher();
  const cls = useClass(classId);
  const tax = useTaxonomy(teacher.data?.profile.stage);
  const subject = tax.data ? subjectById(tax.data, subjectId)?.label[locale] : "";
  return (
    <h1 className="text-2xl font-bold">
      {subject} {cls.data && <span className="text-muted">· <bdi dir="ltr">{cls.data.displayName}</bdi></span>}
    </h1>
  );
}
