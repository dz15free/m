"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, LoaderCircle, Printer } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useClasses, useTaxonomy, useTeacher } from "@/features/classes/hooks";
import { todayInAlgiers } from "@/features/attendance/logic";
import { useCalendar } from "@/features/schedule/repo";
import { PrintHeader } from "@/features/logbook/print-header";
import { getCurriculum } from "@/features/lessons/repo";
import { curriculumId, type Curriculum } from "@/features/lessons/logic";
import { parseAcademicYearId } from "@/shared/academic-year";
import { levelById, subjectById } from "@/shared/taxonomy/taxonomy";
import { monthName } from "@/i18n/dates";
import { cn } from "@/lib/utils/cn";
import { defaultStart } from "./logic";
import { AR_COLUMNS, arabicColumns, entriesOfWeek, monthWeeks, schoolMonths, topicsOf, type MonthWeek } from "./monthly";

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const dmy = (iso: string) => `${dm(iso)}/${iso.slice(0, 4)}`;

/** «أكتوبر 2026» / « octobre 2026 » */
export function useMonthLabel() {
  const locale = useLocale() as "ar" | "fr";
  return (month: string) => `${monthName(Number(month.slice(5, 7)), locale)} ${month.slice(0, 4)}`;
}

export function MonthlySheet({ month: monthParam, classId: classParam }: { month?: string; classId?: string }) {
  const t = useTranslations("planning.monthlyPlan");
  const locale = useLocale() as "ar" | "fr";
  const monthLabel = useMonthLabel();
  const teacher = useTeacher();
  const classes = useClasses();
  const calendar = useCalendar();
  const tax = useTaxonomy(teacher.data?.profile.stage);

  const active = (classes.data ?? []).filter((c) => !c.archived);
  const cls = active.find((c) => c.id === classParam) ?? active[0];
  // مواد القسم المقرّرة لمستواه، بترتيب التصنيف (العربية أولًا ثم الرياضيات…)
  const subjects = cls && tax.data
    ? tax.data.subjects.filter((s) => cls.subjectIds.includes(s.id) && s.levels.includes(cls.level)).map((s) => s.id)
    : [];
  const curricula = useQueries({
    queries: subjects.map((s) => ({ queryKey: ["curriculum", curriculumId(cls!.level, s)], queryFn: () => getCurriculum(curriculumId(cls!.level, s)), staleTime: 60 * 60_000 })),
  });

  if (!teacher.data || !classes.data || !calendar.data || !tax.data || curricula.some((q) => q.isLoading)) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  if (!cls) return <Card className="py-10 text-center text-muted">{t("noClasses")}</Card>;

  const cal = calendar.data;
  const startYear = parseAcademicYearId(teacher.data.profile.activeYearId)?.startYear ?? new Date().getFullYear();
  const start = defaultStart(startYear);
  const months = schoolMonths(start, cal);
  const today = todayInAlgiers().slice(0, 7);
  const month = months.includes(monthParam ?? "") ? monthParam! : months.includes(today) ? today : today < months[0]! ? months[0]! : months.at(-1)!;
  const i = months.indexOf(month);
  const weeks = monthWeeks(month, start, cal);
  const curOf = new Map(subjects.map((s, k) => [s, curricula[k]?.data ?? null]));
  const href = (m: string, c = cls.id) => `/app/planning/monthly?m=${m}&c=${c}`;
  const Prev = locale === "ar" ? ChevronRight : ChevronLeft;
  const Next = locale === "ar" ? ChevronLeft : ChevronRight;

  // العطل والاختبارات التي تمسّ الشهر
  const holidays = cal.holidays.filter((h) => h.start.slice(0, 7) <= month && month <= h.end.slice(0, 7));
  const exams = (cal.exams ?? []).map((e) => ({ term: e.term, days: e.days.filter((d) => d.startsWith(month)) })).filter((e) => e.days.length);

  return (
    <div className="space-y-4">
      <div className="space-y-3 print:hidden">
        {active.length > 1 && (
          <nav aria-label={t("class")} className="flex flex-wrap gap-2">
            {active.map((c) => (
              <Link
                key={c.id}
                href={href(month, c.id)}
                aria-current={c.id === cls.id ? "page" : undefined}
                className={cn("rounded-full px-4 py-2 text-sm font-semibold", c.id === cls.id ? "bg-brand-700 text-white" : "bg-surface text-ink shadow-card hover:bg-brand-50")}
              >
                <bdi dir="ltr">{c.displayName}</bdi>
              </Link>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {i > 0 ? (
            <Link href={href(months[i - 1]!)} aria-label={t("prev")} className={buttonClass("secondary")}>
              <Prev aria-hidden className="size-4" />
            </Link>
          ) : null}
          <p className="min-w-40 text-center text-lg font-bold">{monthLabel(month)}</p>
          {i < months.length - 1 ? (
            <Link href={href(months[i + 1]!)} aria-label={t("next")} className={buttonClass("secondary")}>
              <Next aria-hidden className="size-4" />
            </Link>
          ) : null}
          <button type="button" onClick={() => window.print()} className={cn(buttonClass("primary"), "ms-auto")}>
            <Printer aria-hidden className="size-4" />
            {t("print")}
          </button>
        </div>
        <p className="text-sm text-muted">{t("source")}</p>
      </div>

      <div className="text-[9pt] print:text-[7pt] print:leading-tight">
        <style>{"@page { size: A4 landscape; margin: 8mm; }"}</style>
        <div className="hidden print:block">
          <PrintHeader
            title={t("sheetTitle", { month: monthLabel(month) })}
            subtitle={`${levelById(tax.data, cls.level)?.label[locale] ?? cls.level} — ${cls.displayName}`}
          />
        </div>
        {weeks.length === 0 ? (
          <Card className="py-10 text-center text-muted">{t("noWeeks")}</Card>
        ) : (
          <div className="overflow-x-auto rounded-card bg-surface shadow-card print:overflow-visible print:rounded-none print:shadow-none">
            <table className="w-full min-w-[56rem] border-collapse print:min-w-0">
              <thead>
                <tr className="bg-brand-50 print:bg-canvas">
                  <th rowSpan={2} className="w-24 border border-ink/40 px-1 py-1">{t("weeks")}</th>
                  {subjects.map((s) =>
                    s === "ar" ? (
                      <th key={s} colSpan={AR_COLUMNS.length} className="border border-ink/40 px-1 py-1">{subjectById(tax.data!, s)?.label[locale]}</th>
                    ) : (
                      <th key={s} rowSpan={2} className="border border-ink/40 px-1 py-1">{subjectById(tax.data!, s)?.label[locale]}</th>
                    ),
                  )}
                </tr>
                <tr className="bg-brand-50 print:bg-canvas">
                  {subjects.includes("ar") && AR_COLUMNS.map((k) => <th key={k} className="border border-ink/40 px-1 py-1 text-[0.9em] font-semibold">{t(k)}</th>)}
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <WeekRow key={w.n} week={w} subjects={subjects} curOf={curOf} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(holidays.length > 0 || exams.length > 0) && (
          <div className="mt-2 space-y-0.5 break-inside-avoid print:mt-1">
            <p className="font-semibold">{t("calendarNote")}</p>
            {exams.map((e) => (
              <p key={`e${e.term}`} className="text-red-800">• {t("exams", { term: e.term })}: <bdi dir="ltr">{e.days.map(dm).join(" ، ")}</bdi></p>
            ))}
            {holidays.map((h) => (
              <p key={h.start}>• {t("holiday", { name: h.label?.[locale] ?? t("holidayName"), from: dmy(h.start), to: dmy(h.end) })}</p>
            ))}
          </div>
        )}

        <div className="mt-6 hidden break-inside-avoid grid-cols-3 text-center font-semibold print:mt-3 print:grid">
          <p>{t("signTeacher")}</p>
          <p>{t("signDirector")}</p>
          <p>{t("signInspector")}</p>
        </div>
      </div>
    </div>
  );
}

function WeekRow({ week: w, subjects, curOf }: { week: MonthWeek; subjects: string[]; curOf: Map<string, Curriculum | null> }) {
  const t = useTranslations("planning.monthlyPlan");
  const locale = useLocale() as "ar" | "fr";
  const entries = new Map(subjects.map((s) => [s, entriesOfWeek(curOf.get(s), w.n)]));
  const examOnly = w.exams.length > 0 && w.days.every((d) => w.exams.some((e) => e.days.includes(d))) && [...entries.values()].every((e) => !e.length);
  const span = subjects.length + (subjects.includes("ar") ? AR_COLUMNS.length - 1 : 0);
  const cell = "border border-ink/40 px-1 py-1 align-top print:py-0.5";

  return (
    <tr className="break-inside-avoid">
      <th scope="row" className={cn(cell, "bg-brand-50/50 text-center font-semibold print:bg-transparent")}>
        <span className="block">{t("weekN", { n: w.index })}</span>
        <span className="block text-[0.85em] font-normal text-muted">{t("schoolWeek", { n: w.n })}</span>
        <bdi dir="ltr" className="block text-[0.85em] font-normal">{dm(w.days[0]!)} – {dm(w.days.at(-1)!)}</bdi>
        {w.exams.map((e) => (
          <span key={e.term} className="mt-0.5 block text-[0.85em] text-red-800">{t("exams", { term: e.term })}</span>
        ))}
        {w.holidays.map((h) => (
          <span key={h.start} className="mt-0.5 block text-[0.85em] font-normal text-brand-800">{h.label?.[locale] ?? t("holidayName")}</span>
        ))}
      </th>
      {examOnly ? (
        <td colSpan={span} className={cn(cell, "bg-red-50 text-center align-middle text-base font-bold text-red-800 print:bg-transparent")}>
          {t("exams", { term: w.exams[0]!.term })}
        </td>
      ) : (
        subjects.map((s) => {
          const list = entries.get(s)!;
          if (s !== "ar") return <td key={s} className={cell}><Topics items={topicsOf(list)} /></td>;
          const ar = arabicColumns(list);
          if (ar.merged) {
            return <td key={s} colSpan={AR_COLUMNS.length} className={cn(cell, "bg-green-50 text-center align-middle font-semibold print:bg-transparent")}><Topics items={ar.merged} /></td>;
          }
          return AR_COLUMNS.map((k) => <td key={`${s}-${k}`} className={cell}><Topics items={ar.cols[k]} /></td>);
        })
      )}
    </tr>
  );
}

function Topics({ items }: { items: string[] }) {
  if (!items.length) return <span className="block text-center text-muted">—</span>;
  return (
    <ul className="space-y-0.5">
      {items.map((x) => (
        <li key={x} dir="auto">{x}</li>
      ))}
    </ul>
  );
}
