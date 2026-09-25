"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, Check, ChevronLeft, ChevronRight, ClipboardCheck, Coffee, LoaderCircle, NotebookPen, UserPlus, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useClasses, useTaxonomy, useTeacher, useUid } from "@/features/classes/hooks";
import { countMarks, sessionKey, todayInAlgiers } from "@/features/attendance/logic";
import { getSession } from "@/features/attendance/repo";
import { subjectById } from "@/shared/taxonomy/taxonomy";
import { cn } from "@/lib/utils/cn";
import { attendancePart, currentAndNext, holidayOf, nowMinutesInAlgiers, slotsForDate, toMinutes } from "./logic";
import { useCalendar, useSchedule } from "./repo";

/** رابط الحضور لحصة من الجدول (التاريخ والجزء مضبوطان مسبقًا). */
export function attendanceHref(classId: string, date: string, part: string) {
  return `/app/classes/${classId}/attendance?date=${date}&part=${encodeURIComponent(part)}`;
}

export function TodayBoard() {
  const t = useTranslations("todayBoard");
  const ts = useTranslations("today");
  const locale = useLocale() as "ar" | "fr";
  const uid = useUid();
  const teacher = useTeacher();
  const classes = useClasses();
  const schedule = useSchedule();
  const calendar = useCalendar();
  const tax = useTaxonomy(teacher.data?.profile.stage);
  const Chevron = locale === "ar" ? ChevronLeft : ChevronRight;

  const today = todayInAlgiers();
  const halfDays = teacher.data?.profile.presetType === "primaryGeneralist";
  const daySlots = schedule.data && calendar.data ? slotsForDate(schedule.data, calendar.data, today) : [];

  // حالة الحضور لكل حصة اليوم (قراءة واحدة لكل حصة، من الكاش غالبًا)
  const sessions = useQueries({
    queries: daySlots.map((s) => {
      const key = sessionKey(today, s.classId, attendancePart(s, halfDays));
      return { queryKey: ["session", uid, key], queryFn: () => getSession(uid!, key), enabled: !!uid, staleTime: 30_000 };
    }),
  });

  if (!teacher.data || !classes.data || !schedule.data || !calendar.data || !tax.data) {
    return (
      <div role="status" className="grid place-items-center py-10">
        <LoaderCircle aria-hidden className="size-7 animate-spin text-brand-700" />
      </div>
    );
  }

  const classById = new Map(classes.data.map((c) => [c.id, c]));
  const firstClass = classes.data[0];
  const steps = [
    classes.data.length === 0 && { key: "classes", href: "/app/classes/new", icon: Users },
    firstClass && classes.data.every((c) => c.studentCount === 0) && { key: "students", href: `/app/classes/${firstClass.id}/students/import`, icon: UserPlus },
    schedule.data.length === 0 && { key: "schedule", href: "/app/schedule", icon: CalendarClock },
  ].filter(Boolean) as { key: "classes" | "students" | "schedule"; href: string; icon: typeof Users }[];

  const now = nowMinutesInAlgiers();
  const { current, next } = currentAndNext(daySlots, now);
  const holiday = holidayOf(calendar.data, today);

  return (
    <div className="space-y-8">
      {schedule.data.length > 0 && (
        <section aria-labelledby="today-sessions" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="today-sessions" className="text-lg font-semibold">{t("sessionsToday")}</h2>
            <Link href={`/app/logbook/daily?date=${today}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand-700">
              <NotebookPen aria-hidden className="size-4" />
              {t("dailyNotebook")}
            </Link>
          </div>
          {daySlots.length === 0 ? (
            <Card className="flex items-center gap-3 text-muted">
              <Coffee aria-hidden className="size-5" />
              {holiday?.label ? holiday.label[locale] : t("dayOff")}
            </Card>
          ) : (
            <ul className="space-y-2">
              {daySlots.map((s, i) => {
                const cls = classById.get(s.classId);
                const session = sessions[i]?.data;
                const ids = cls?.roster.map((r) => r.id) ?? [];
                const counts = session ? countMarks(ids, session.attendance) : null;
                const isCurrent = current?.id === s.id;
                const isNext = !current && next?.id === s.id;
                const ended = toMinutes(s.end) <= now;
                return (
                  <li key={s.id}>
                    <Link
                      href={attendanceHref(s.classId, today, attendancePart(s, halfDays))}
                      className={cn(
                        "flex items-center gap-4 rounded-card p-4 shadow-card transition-shadow hover:shadow-md",
                        isCurrent ? "bg-linear-to-br from-brand-900 to-brand-600 text-white" : "bg-surface",
                        ended && !isCurrent && "opacity-75",
                      )}
                    >
                      <span className="w-16 shrink-0 text-center">
                        <span className="block font-bold tabular-nums" dir="ltr">{s.start}</span>
                        <span className={cn("block text-xs", isCurrent ? "text-white/80" : "text-muted")}>
                          {isCurrent ? t("current") : isNext ? t("upcoming") : ended ? t("done") : ""}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <bdi dir="ltr" className="block text-lg font-bold">{cls?.displayName ?? "—"}</bdi>
                        <span className={cn("block truncate text-sm", isCurrent ? "text-white/85" : "text-muted")}>
                          {subjectById(tax.data!, s.subjectId)?.label[locale] ?? s.subjectId}
                        </span>
                      </span>
                      {counts ? (
                        <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", isCurrent ? "bg-white/20" : "bg-brand-50 text-brand-800")}>
                          <Check aria-hidden className="size-3.5" />
                          {t("attendanceDone", { p: counts.p + counts.l, total: ids.length })}
                        </span>
                      ) : (
                        <span className={cn("flex items-center gap-1 text-xs font-semibold", isCurrent ? "text-white" : "text-brand-700")}>
                          <ClipboardCheck aria-hidden className="size-4" />
                          {t("takeAttendance")}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {steps.length > 0 && (
        <section aria-labelledby="next-steps" className="space-y-3">
          <h2 id="next-steps" className="text-lg font-semibold">{ts("nextSteps")}</h2>
          <ol className="grid gap-3 md:grid-cols-3">
            {steps.map(({ key, href, icon: Icon }, i) => (
              <li key={key}>
                <Link href={href} className="group block h-full">
                  <Card className="flex h-full items-start gap-4 transition-shadow group-hover:shadow-md">
                    <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                      <Icon aria-hidden className="size-6" />
                      <span className="absolute -end-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-brand-700 text-[11px] font-bold text-white">{i + 1}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{ts(`steps.${key}.title`)}</span>
                      <span className="mt-0.5 block text-sm text-muted">{ts(`steps.${key}.body`)}</span>
                    </span>
                    <Chevron aria-hidden className="mt-3 size-5 shrink-0 text-muted md:hidden" />
                  </Card>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
