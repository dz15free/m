"use client";

import { useTranslations } from "next-intl";
import { useClasses, useTeacher } from "@/features/classes/hooks";
import { todayInAlgiers } from "@/features/attendance/logic";
import { useCalendar } from "@/features/schedule/repo";
import type { Notice } from "@/features/notifications/repo";
import { parseAcademicYearId } from "@/shared/academic-year";
import { defaultStart } from "./logic";
import { monthPublishedAt, schoolMonths } from "./monthly";
import { useMonthLabel } from "./monthly-sheet";

/** إشعار «توزيع شهري جديد» لكل شهر دراسي: يُحسب على الجهاز (لا كتابة في القاعدة)، تاريخه أول الشهر،
    فيظهر جديدًا في الجرس عند دخول الشهر حتى يفتحه الأستاذ (نفس readAt بقية الإشعارات). */
export function useMonthlyNotice(): Notice | null {
  const t = useTranslations("notifications");
  const monthLabel = useMonthLabel();
  const teacher = useTeacher();
  const classes = useClasses();
  const calendar = useCalendar();
  const startYear = teacher.data ? parseAcademicYearId(teacher.data.profile.activeYearId)?.startYear : undefined;
  if (!startYear || !calendar.data || !classes.data?.some((c) => !c.archived)) return null;
  const month = todayInAlgiers().slice(0, 7);
  if (!schoolMonths(defaultStart(startYear), calendar.data).includes(month)) return null;
  const title = t("monthlyTitle", { month: monthLabel(month) });
  const body = t("monthlyBody", { month: monthLabel(month) });
  return {
    id: `monthly-${month}`,
    kind: "planning",
    title: { ar: title, fr: title },
    body: { ar: body, fr: body },
    link: `/app/planning/monthly?m=${month}`,
    createdAt: monthPublishedAt(month),
    personal: true,
  };
}
