"use client";

import Link from "next/link";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useClasses, useTaxonomy, useTeacher, useUid } from "@/features/classes/hooks";
import { todayInAlgiers } from "@/features/attendance/logic";
import { useCalendar } from "@/features/schedule/repo";
import { parseAcademicYearId } from "@/shared/academic-year";
import { subjectById } from "@/shared/taxonomy/taxonomy";
import { cn } from "@/lib/utils/cn";
import { getCurriculum } from "@/features/lessons/repo";
import { curriculumId } from "@/features/lessons/logic";
import { defaultStart, progressionId, progressStatus, rowsFromCurriculum, schoolWeekOf, type Status } from "./logic";
import { listProgressions } from "./repo";
import { schoolMonths } from "./monthly";
import { useMonthLabel } from "./monthly-sheet";

export const STATUS_STYLE: Record<Status["kind"], string> = {
  empty: "bg-canvas text-muted",
  done: "bg-green-50 text-green-800",
  onTrack: "bg-green-50 text-green-800",
  late: "bg-red-50 text-red-800",
  ahead: "bg-brand-50 text-brand-800",
};

export function PlanningOverview() {
  const t = useTranslations("planning");
  const monthLabel = useMonthLabel();
  const locale = useLocale() as "ar" | "fr";
  const uid = useUid();
  const teacher = useTeacher();
  const classes = useClasses();
  const calendar = useCalendar();
  const tax = useTaxonomy(teacher.data?.profile.stage);
  const progs = useQuery({ queryKey: ["progressions", uid ?? ""], queryFn: () => listProgressions(uid!), enabled: !!uid });
  // المناهج المنشورة لأقسام الأستاذ: توزيع رسمي مقترح لما لم يحفظ له توزيعًا
  const curIds = [...new Set((classes.data ?? []).filter((c) => !c.archived).flatMap((c) => c.subjectIds.map((s) => curriculumId(c.level, s))))];
  const curricula = useQueries({
    queries: curIds.map((id) => ({ queryKey: ["curriculum", id], queryFn: () => getCurriculum(id), staleTime: 60 * 60_000 })),
  });
  const curById = new Map(curIds.map((id, i) => [id, curricula[i]?.data ?? null]));

  if (!teacher.data || !classes.data || !calendar.data || !tax.data || !progs.data) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  const active = classes.data.filter((c) => !c.archived);
  if (!active.length) return <Card className="py-10 text-center text-muted">{t("noClasses")}</Card>;

  const byId = new Map(progs.data.map((p) => [progressionId(p.classId, p.subjectId), p]));
  const startYear = parseAcademicYearId(teacher.data.profile.activeYearId)?.startYear ?? new Date().getFullYear();
  const today = todayInAlgiers();
  const weekFor = (start: string) => schoolWeekOf(today, start, calendar.data!.schoolDays, calendar.data!.holidays);
  const currentWeek = weekFor(progs.data[0]?.startDate ?? defaultStart(startYear));
  const Chevron = locale === "ar" ? ChevronLeft : ChevronRight;
  const months = schoolMonths(defaultStart(startYear), calendar.data);
  const month = months.includes(today.slice(0, 7)) ? today.slice(0, 7) : null;

  return (
    <div className="space-y-5">
      <Card className="flex items-center gap-3 bg-linear-to-br from-brand-900 to-brand-600 text-white">
        <CalendarRange aria-hidden className="size-7 shrink-0" />
        <div>
          <p className="text-sm text-white/80">{t("whereAmI")}</p>
          <p className="text-lg font-bold">{currentWeek ? t("currentWeek", { n: currentWeek }) : t("beforeStart")}</p>
        </div>
      </Card>

      <Link href="/app/planning/monthly" className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card hover:bg-brand-50">
        <CalendarDays aria-hidden className="size-7 shrink-0 text-brand-700" />
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{month ? t("monthlyPlan.cardTitle", { month: monthLabel(month) }) : t("monthlyPlan.title")}</span>
          <span className="block text-sm text-muted">{t("monthlyPlan.cardBody")}</span>
        </span>
        <Chevron aria-hidden className="size-4 shrink-0 text-muted" />
      </Link>

      {active.map((c) => {
        // المواد ذات التوزيع أولًا
        const subjects = c.subjectIds.filter((s) => { const subj = subjectById(tax.data!, s); return !subj || subj.levels.includes(c.level); }).sort((a, b) => Number(byId.has(progressionId(c.id, b))) - Number(byId.has(progressionId(c.id, a))));
        return (
          <section key={c.id} aria-labelledby={`c-${c.id}`} className="space-y-2">
            <h2 id={`c-${c.id}`} className="text-lg font-bold" dir="ltr">{c.displayName}</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
              {subjects.map((s) => {
                const p = byId.get(progressionId(c.id, s));
                const cur = !p ? curById.get(curriculumId(c.level, s)) : null;
                const st = progressStatus(p?.rows ?? (cur?.entries.length ? rowsFromCurriculum(cur, currentWeek) : []), p ? weekFor(p.startDate) : currentWeek);
                return (
                  <li key={s}>
                    <Link href={`/app/planning/${c.id}/${s}`} className="flex items-center gap-3 px-4 py-3 hover:bg-brand-50">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">
                          {subjectById(tax.data!, s)?.label[locale] ?? s}
                          {cur?.entries.length ? <span className="ms-2 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800">{t("official")}</span> : null}
                        </span>
                        {st.nextRow ? (
                          <span dir="auto" className="block truncate text-sm text-muted">{t("next", { content: st.nextRow.content || st.nextRow.unit })}</span>
                        ) : null}
                        {st.total > 0 && (
                          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-canvas">
                            <span className="block h-full rounded-full bg-brand-600" style={{ width: `${Math.round((st.doneCount / st.total) * 100)}%` }} />
                          </span>
                        )}
                      </span>
                      <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLE[st.kind])}>
                        {t(`status.${st.kind}`, { n: st.weeks })}
                      </span>
                      <Chevron aria-hidden className="size-4 shrink-0 text-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
