"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { BookOpenCheck, NotebookPen, Printer } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Greeting } from "@/features/auth/account";
import { todayInAlgiers } from "@/features/attendance/logic";
import { useClasses, useTaxonomy, useTeacher } from "@/features/classes/hooks";
import { defaultStart, schoolWeekOf } from "@/features/planning/logic";
import { formatHijri, formatLongDate } from "@/i18n/dates";
import { parseAcademicYearId } from "@/shared/academic-year";
import { levelById } from "@/shared/taxonomy/taxonomy";
import { useCalendar, useSchedule } from "./repo";
import { slotsForDate } from "./logic";

/** ترحيب «اليوم»: التاريخ بالتقويمين، المستوى، الأسبوع الدراسي، ودفتر اليوم بلمسة. */
export function WelcomeCard() {
  const t = useTranslations("welcome");
  const locale = useLocale() as "ar" | "fr";
  const teacher = useTeacher();
  const classes = useClasses();
  const calendar = useCalendar();
  const schedule = useSchedule();
  const tax = useTaxonomy(teacher.data?.profile.stage);
  const today = todayInAlgiers();
  const startYear = parseAcademicYearId(teacher.data?.profile.activeYearId ?? "")?.startYear;
  const week = calendar.data && startYear ? schoolWeekOf(today, defaultStart(startYear), calendar.data.schoolDays, calendar.data.holidays) : 0;
  const levels = [...new Set((classes.data ?? []).map((c) => c.level))]
    .map((l) => (tax.data ? levelById(tax.data, l)?.label[locale] : l))
    .filter(Boolean)
    .join("، ");
  const hasToday = !!(schedule.data && calendar.data && slotsForDate(schedule.data, calendar.data, today).length);
  const hijri = locale === "ar" ? formatHijri(today) : "";

  return (
    <section className="relative overflow-hidden rounded-card bg-linear-to-br from-brand-900 to-brand-600 p-5 text-white shadow-card sm:p-6">
      <p className="text-sm text-white/80">
        {formatLongDate(new Date(`${today}T12:00:00`), locale)}
        {hijri && ` · ${hijri}`}
      </p>
      <Greeting className="mt-1 text-2xl font-bold sm:text-3xl" />
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {levels && <span className="rounded-full bg-white/15 px-3 py-1">{levels}</span>}
        {week > 0 && <span className="rounded-full bg-white/15 px-3 py-1">{t("week", { n: week })}</span>}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {hasToday ? (
          <a href={`/app/logbook/daily?date=${today}&print=1`} className={buttonClass("secondary", "md", "bg-white text-brand-900")}>
            <Printer aria-hidden className="size-4" />
            {t("printToday")}
          </a>
        ) : (
          <Link href="/app/logbook/daily" className={buttonClass("secondary", "md", "bg-white text-brand-900")}>
            <NotebookPen aria-hidden className="size-4" />
            {t("openNotebook")}
          </Link>
        )}
        <Link href="/app/lessons" className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold text-white ring-1 ring-white/40 hover:bg-white/10">
          <BookOpenCheck aria-hidden className="size-4" />
          {t("lessons")}
        </Link>
      </div>
    </section>
  );
}
