"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, ChevronLeft, ChevronRight, LoaderCircle, NotebookPen, Printer } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useClasses, useTaxonomy, useTeacher, useUid } from "@/features/classes/hooks";
import type { ClassDoc } from "@/features/classes/repo";
import { isIsoDate, shiftDate, todayInAlgiers } from "@/features/attendance/logic";
import { holidayOf, slotsForDate, type Slot } from "@/features/schedule/logic";
import { useCalendar, useSchedule } from "@/features/schedule/repo";
import { formatLongDate } from "@/i18n/dates";
import { subjectById, type StageTaxonomy } from "@/shared/taxonomy/taxonomy";
import { cn } from "@/lib/utils/cn";
import { emptyLesson, isBlank, lessonKey, LESSON_TEXT_FIELDS, FIELD_MAX, type LessonEntry, type LessonStatus } from "./logic";
import { weekDates } from "./logic";
import { listLessons, saveLesson } from "./repo";
import { PrintHeader } from "./print-header";

const STATUS_STYLE: Record<LessonStatus, string> = {
  done: "bg-green-50 text-green-800",
  partial: "bg-amber-50 text-amber-900",
  notDone: "bg-red-50 text-red-800",
};

export function DailyNotebook({ initialDate }: { initialDate?: string }) {
  const t = useTranslations("logbook.daily");
  const locale = useLocale() as "ar" | "fr";
  const uid = useUid();
  const queryClient = useQueryClient();
  const teacher = useTeacher();
  const classes = useClasses();
  const schedule = useSchedule();
  const calendar = useCalendar();
  const tax = useTaxonomy(teacher.data?.profile.stage);
  const [anchor, setAnchor] = useState(() => (initialDate && isIsoDate(initialDate) ? initialDate : todayInAlgiers()));
  const [editing, setEditing] = useState<string | null>(null);

  const days = calendar.data ? weekDates(anchor, calendar.data.schoolDays) : [];
  const lessonsKey = ["lessons", uid ?? "", days.join(",")];
  const lessons = useQuery({
    queryKey: lessonsKey,
    queryFn: () => listLessons(uid!, days),
    enabled: !!uid && days.length > 0,
    staleTime: 60_000,
  });

  if (!teacher.data || !classes.data || !schedule.data || !calendar.data || !tax.data || !lessons.data) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }

  const Prev = locale === "ar" ? ChevronRight : ChevronLeft;
  const Next = locale === "ar" ? ChevronLeft : ChevronRight;
  const classById = new Map(classes.data.map((c) => [c.id, c]));
  const taxonomy = tax.data;
  const cal = calendar.data;
  const entries = lessons.data;

  async function save(entry: LessonEntry) {
    if (!uid) return;
    await saveLesson(uid, entry);
    const key = lessonKey(entry.date, entry.classId, entry.subjectId, entry.start);
    queryClient.setQueryData<Map<string, LessonEntry>>(lessonsKey, (prev) => {
      const next = new Map(prev);
      if (isBlank(entry)) next.delete(key);
      else next.set(key, entry);
      return next;
    });
    setEditing(null);
  }

  if (schedule.data.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <CalendarClock aria-hidden className="size-8 text-brand-700" />
        <p className="max-w-sm text-muted">{t("noSchedule")}</p>
        <Link href="/app/schedule" className={buttonClass("primary")}>{t("setSchedule")}</Link>
      </Card>
    );
  }

  const rowsOf = (date: string) =>
    slotsForDate(schedule.data!, cal, date).map((slot) => {
      const key = lessonKey(date, slot.classId, slot.subjectId, slot.start);
      return { slot, key, entry: entries.get(key) ?? emptyLesson({ date, classId: slot.classId, subjectId: slot.subjectId, start: slot.start, end: slot.end }) };
    });

  const range = days.length ? `${formatLongDate(new Date(`${days[0]}T12:00:00`), locale)} — ${formatLongDate(new Date(`${days[days.length - 1]}T12:00:00`), locale)}` : "";

  return (
    <>
      {/* ── الشاشة ── */}
      <div className="space-y-4 pb-4 print:hidden">
        <Card className="flex items-center gap-2 p-3">
          <button type="button" onClick={() => setAnchor(shiftDate(anchor, -7))} aria-label={t("prevWeek")} className="grid size-11 place-items-center rounded-full hover:bg-canvas">
            <Prev aria-hidden className="size-5" />
          </button>
          <p className="min-w-0 flex-1 text-center text-sm font-semibold">{range}</p>
          <button type="button" onClick={() => setAnchor(shiftDate(anchor, 7))} aria-label={t("nextWeek")} className="grid size-11 place-items-center rounded-full hover:bg-canvas">
            <Next aria-hidden className="size-5" />
          </button>
        </Card>
        <div className="flex flex-wrap gap-2">
          {!days.includes(todayInAlgiers()) && (
            <button type="button" onClick={() => setAnchor(todayInAlgiers())} className={buttonClass("secondary")}>{t("thisWeek")}</button>
          )}
          <button type="button" onClick={() => window.print()} className={buttonClass("secondary")}>
            <Printer aria-hidden className="size-4" />
            {t("print")}
          </button>
        </div>

        {days.map((date) => {
          const rows = rowsOf(date);
          const holiday = holidayOf(cal, date);
          return (
            <section key={date} aria-labelledby={`d-${date}`} className="space-y-2">
              <h2 id={`d-${date}`} className={cn("text-sm font-semibold", date === todayInAlgiers() ? "text-brand-700" : "text-muted")}>
                {formatLongDate(new Date(`${date}T12:00:00`), locale)}
              </h2>
              {rows.length === 0 ? (
                <p className="rounded-card bg-surface p-4 text-sm text-muted shadow-card">{holiday?.label?.[locale] ?? t("dayOff")}</p>
              ) : (
                <ul className="space-y-2">
                  {rows.map(({ slot, key, entry }) =>
                    editing === key ? (
                      <li key={key}>
                        <LessonEditor entry={entry} slot={slot} cls={classById.get(slot.classId)} taxonomy={taxonomy} onSave={save} onCancel={() => setEditing(null)} />
                      </li>
                    ) : (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => setEditing(key)}
                          className="flex w-full items-start gap-3 rounded-card bg-surface p-4 text-start shadow-card transition-shadow hover:shadow-md"
                        >
                          <bdi dir="ltr" className="w-12 shrink-0 pt-0.5 text-sm font-semibold tabular-nums">{slot.start}</bdi>
                          <span className="min-w-0 flex-1 space-y-0.5">
                            <span className="flex flex-wrap items-center gap-x-2 text-sm">
                              <bdi dir="ltr" className="font-bold">{classById.get(slot.classId)?.displayName}</bdi>
                              <span className="text-muted">{subjectById(taxonomy, slot.subjectId)?.label[locale]}</span>
                            </span>
                            {isBlank(entry) ? (
                              <span className="block text-sm text-muted/80">{t("empty")}</span>
                            ) : (
                              <>
                                <span className="block font-semibold">{entry.title || entry.unit}</span>
                                {entry.objective && <span className="block text-sm text-muted">{entry.objective}</span>}
                              </>
                            )}
                          </span>
                          {!isBlank(entry) ? (
                            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[entry.status])}>{t(`statuses.${entry.status}`)}</span>
                          ) : (
                            <NotebookPen aria-hidden className="size-4 shrink-0 text-muted" />
                          )}
                        </button>
                      </li>
                    ),
                  )}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* ── الطباعة: جدول الدفتر اليومي (A4 أفقي) ── */}
      <div className="hidden print:block">
        <style>{"@page { size: A4 landscape; margin: 10mm; }"}</style>
        <PrintHeader title={t("title")} subtitle={range} />
        {days.map((date) => {
          const rows = rowsOf(date);
          if (!rows.length) return null;
          return (
            <table key={date} className="mb-4 w-full break-inside-avoid border-collapse text-[9.5pt]">
              <caption className="border border-ink bg-canvas py-1 text-start font-bold ps-2">{formatLongDate(new Date(`${date}T12:00:00`), locale)}</caption>
              <thead>
                <tr className="bg-canvas">
                  {[t("time"), t("class"), t("subject"), ...LESSON_TEXT_FIELDS.map((f) => t(`fields.${f}`))].map((h) => (
                    <th key={h} className="border border-ink px-1.5 py-1 text-start font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ slot, key, entry }) => (
                  <tr key={key} className="align-top">
                    <td className="border border-ink px-1.5 py-1 whitespace-nowrap"><bdi dir="ltr">{slot.start}–{slot.end}</bdi></td>
                    <td className="border border-ink px-1.5 py-1"><bdi dir="ltr">{classById.get(slot.classId)?.displayName}</bdi></td>
                    <td className="border border-ink px-1.5 py-1">{subjectById(taxonomy, slot.subjectId)?.label[locale]}</td>
                    {LESSON_TEXT_FIELDS.map((f) => (
                      <td key={f} className="h-9 border border-ink px-1.5 py-1">
                        {f === "notes" && !isBlank(entry) && entry.status !== "done" ? `${t(`statuses.${entry.status}`)}${entry.notes ? " — " : ""}` : ""}
                        {entry[f]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })}
      </div>
    </>
  );
}

function LessonEditor({
  entry,
  slot,
  cls,
  taxonomy,
  onSave,
  onCancel,
}: {
  entry: LessonEntry;
  slot: Slot;
  cls?: ClassDoc;
  taxonomy: StageTaxonomy;
  onSave: (e: LessonEntry) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useTranslations("logbook.daily");
  const locale = useLocale() as "ar" | "fr";
  const [draft, setDraft] = useState(entry);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");

  async function submit(next: LessonEntry) {
    setState("saving");
    try {
      await onSave(next);
    } catch {
      setState("error");
    }
  }

  return (
    <Card className="space-y-3 ring-2 ring-brand-200">
      <p className="text-sm">
        <bdi dir="ltr" className="font-semibold tabular-nums">{slot.start}–{slot.end}</bdi> · <bdi dir="ltr" className="font-bold">{cls?.displayName}</bdi> ·{" "}
        {subjectById(taxonomy, slot.subjectId)?.label[locale]}
      </p>
      {LESSON_TEXT_FIELDS.map((f) => (
        <label key={f} className="block space-y-1">
          <span className="text-sm font-medium">{t(`fields.${f}`)}</span>
          <textarea
            value={draft[f]}
            onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
            placeholder={t(`placeholders.${f}`)}
            maxLength={FIELD_MAX[f]}
            rows={f === "notes" || f === "objective" ? 2 : 1}
            dir="auto"
            autoFocus={f === "title" && isBlank(entry)}
            className="block w-full resize-y rounded-xl border border-line bg-surface px-3 py-2.5 outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100"
          />
        </label>
      ))}
      <div role="radiogroup" aria-label={t("status")} className="flex flex-wrap gap-2">
        {(["done", "partial", "notDone"] as LessonStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={draft.status === s}
            onClick={() => setDraft({ ...draft, status: s })}
            className={cn("min-h-10 rounded-full px-4 text-sm font-medium ring-1", draft.status === s ? "bg-brand-700 text-white ring-brand-700" : "ring-line")}
          >
            {t(`statuses.${s}`)}
          </button>
        ))}
      </div>
      {state === "error" && <p role="alert" className="text-sm text-red-700">{t("error")}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={state === "saving"} onClick={() => submit(draft)} className={buttonClass("primary")}>
          {state === "saving" && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
          {t("save")}
        </button>
        <button type="button" onClick={onCancel} className={buttonClass("secondary")}>{t("cancel")}</button>
        {!isBlank(entry) && (
          <button
            type="button"
            onClick={() => submit({ ...draft, unit: "", title: "", objective: "", materials: "", notes: "" })}
            className={buttonClass("ghost", "md", "ms-auto text-red-700")}
          >
            {t("clear")}
          </button>
        )}
      </div>
    </Card>
  );
}
