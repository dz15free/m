"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { useLocale, useTranslations } from "next-intl";
import { BookOpenCheck, CalendarClock, ChevronLeft, ChevronRight, LoaderCircle, NotebookPen, Printer, Sparkles } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getFirebase } from "@/lib/firebase/client";
import { useClasses, useTaxonomy, useTeacher, useUid } from "@/features/classes/hooks";
import type { ClassDoc } from "@/features/classes/repo";
import { isIsoDate, shiftDate, todayInAlgiers } from "@/features/attendance/logic";
import { curriculumWeeks, type LessonSummary } from "@/features/lessons/logic";
import { suggestionToEntry, useNotebookSuggestions, type Suggestion } from "@/features/lessons/suggest";
import { defaultStart, schoolWeekOf } from "@/features/planning/logic";
import { DEFAULT_CALENDAR, holidayOf, slotsForDate, type Slot } from "@/features/schedule/logic";
import { useCalendar, useSchedule } from "@/features/schedule/repo";
import { formatHijri, formatLongDate } from "@/i18n/dates";
import { parseAcademicYearId } from "@/shared/academic-year";
import { subjectById, type StageTaxonomy } from "@/shared/taxonomy/taxonomy";
import { cn } from "@/lib/utils/cn";
import {
  durationMinutes,
  emptyLesson,
  FIELD_MAX,
  isBlank,
  LESSON_META_FIELDS,
  LESSON_TEXT_FIELDS,
  lessonKey,
  META_MAX,
  periodOf,
  prepTitle,
  weekDates,
  type LessonEntry,
  type LessonStatus,
} from "./logic";
import { listLessons, listPreps, saveLesson } from "./repo";

const STATUS_STYLE: Record<LessonStatus, string> = {
  done: "bg-green-50 text-green-800",
  partial: "bg-amber-50 text-amber-900",
  notDone: "bg-red-50 text-red-800",
};

/* نموذج الفرنسية (مثل السنة الرابعة): يُطبع بالفرنسية أيًّا كانت لغة الواجهة */
const FR = {
  title: "Cahier journal",
  date: "Date",
  project: "Projet",
  sequence: "Séquence",
  week: "Semaine",
  horaire: "Horaire",
  duree: "Durée",
  activites: "Activités pédagogiques",
  composantes: "Composantes de la compétence",
  objectifs: "Objectifs d'apprentissage",
  morning: "Matinée",
  afternoon: "Après-midi",
  remarks: "Observations",
  seen: "Vu par M. le Directeur le",
  sign: "Signature et cachet",
};

type Row = { slot: Slot; key: string; entry: LessonEntry; sug: Suggestion | undefined };

export function DailyNotebook({ initialDate, autoPrint = false }: { initialDate?: string; autoPrint?: boolean }) {
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
  const printed = useRef(false);

  const days = calendar.data ? weekDates(anchor, calendar.data.schoolDays) : [];
  const lessonsKey = ["lessons", uid ?? "", days.join(",")];
  const lessons = useQuery({
    queryKey: lessonsKey,
    queryFn: () => listLessons(uid!, days),
    enabled: !!uid && days.length > 0,
    staleTime: 60_000,
  });

  const cal = calendar.data ?? DEFAULT_CALENDAR;
  const slotRows = (date: string) =>
    (schedule.data ? slotsForDate(schedule.data, cal, date) : []).map((slot) => ({ slot, key: lessonKey(date, slot.classId, slot.subjectId, slot.start) }));
  const startYear = parseAcademicYearId(teacher.data?.profile.activeYearId ?? "")?.startYear ?? new Date().getFullYear();
  const suggestions = useNotebookSuggestions({
    days,
    rows: days.flatMap((date) => slotRows(date).map((r) => ({ ...r, date }))),
    classes: classes.data ?? [],
    calendar: cal,
    startYear,
  });

  const ready = !!(teacher.data && classes.data && schedule.data && calendar.data && tax.data && lessons.data);
  // الرابط «?date=…&print=1»: الدفتر يُفتح جاهزًا للطباعة أو الحفظ PDF
  useEffect(() => {
    if (!autoPrint || !ready || suggestions.loading || printed.current) return;
    printed.current = true;
    const id = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(id);
  }, [autoPrint, ready, suggestions.loading]);

  if (!ready) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }

  const Prev = locale === "ar" ? ChevronRight : ChevronLeft;
  const Next = locale === "ar" ? ChevronLeft : ChevronRight;
  const classById = new Map(classes.data!.map((c) => [c.id, c]));
  const taxonomy = tax.data!;
  const entries = lessons.data!;
  const multiClass = new Set(schedule.data!.map((s) => s.classId)).size > 1;
  const yearStart = defaultStart(startYear);

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

  if (schedule.data!.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <CalendarClock aria-hidden className="size-8 text-brand-700" />
        <p className="max-w-sm text-muted">{t("noSchedule")}</p>
        <Link href="/app/schedule" className={buttonClass("primary")}>{t("setSchedule")}</Link>
      </Card>
    );
  }

  const rowsOf = (date: string): Row[] =>
    slotRows(date).map(({ slot, key }) => ({
      slot,
      key,
      sug: suggestions.map.get(key),
      entry: entries.get(key) ?? emptyLesson({ date, classId: slot.classId, subjectId: slot.subjectId, start: slot.start, end: slot.end }),
    }));
  /** ما يُعرض ويُطبع: المحفوظ، وإلا الحصة المقترحة من المذكرات */
  const effective = (r: Row): LessonEntry => (isBlank(r.entry) && r.sug ? suggestionToEntry(r.sug, r.entry) : r.entry);

  const range = days.length ? `${formatLongDate(new Date(`${days[0]}T12:00:00`), locale)} — ${formatLongDate(new Date(`${days[days.length - 1]}T12:00:00`), locale)}` : "";
  const printDays = autoPrint && initialDate && days.includes(initialDate) ? [initialDate] : days;
  const today = todayInAlgiers();

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
          {!days.includes(today) && (
            <button type="button" onClick={() => setAnchor(today)} className={buttonClass("secondary")}>{t("thisWeek")}</button>
          )}
          {days.includes(today) && (
            <a href={`/app/logbook/daily?date=${today}&print=1`} className={buttonClass("primary")}>
              <Printer aria-hidden className="size-4" />
              {t("printToday")}
            </a>
          )}
          <button type="button" onClick={() => window.print()} className={buttonClass("secondary")}>
            <Printer aria-hidden className="size-4" />
            {t("print")}
          </button>
        </div>
        {suggestions.map.size > 0 && (
          <p className="flex items-start gap-2 rounded-card bg-brand-50 p-3 text-sm text-brand-900">
            <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t("autoNote")}
          </p>
        )}

        {days.map((date) => {
          const rows = rowsOf(date);
          const holiday = holidayOf(cal, date);
          return (
            <section key={date} aria-labelledby={`d-${date}`} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 id={`d-${date}`} className={cn("text-sm font-semibold", date === today ? "text-brand-700" : "text-muted")}>
                  {formatLongDate(new Date(`${date}T12:00:00`), locale)}
                </h2>
                {rows.length > 0 && (
                  <a href={`/app/logbook/daily?date=${date}&print=1`} className="inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-brand-800 hover:bg-brand-50">
                    <Printer aria-hidden className="size-3.5" />
                    {t("printDay")}
                  </a>
                )}
              </div>
              {rows.length === 0 ? (
                <p className="rounded-card bg-surface p-4 text-sm text-muted shadow-card">{holiday?.label?.[locale] ?? t("dayOff")}</p>
              ) : (
                <ul className="space-y-2">
                  {rows.map((r) => {
                    const shown = effective(r);
                    const suggested = isBlank(r.entry) && !!r.sug;
                    return editing === r.key ? (
                      <li key={r.key}>
                        <LessonEditor row={r} initial={shown} cls={classById.get(r.slot.classId)} taxonomy={taxonomy} onSave={save} onCancel={() => setEditing(null)} />
                      </li>
                    ) : (
                      <li key={r.key}>
                        <button
                          type="button"
                          onClick={() => setEditing(r.key)}
                          className="flex w-full items-start gap-3 rounded-card bg-surface p-4 text-start shadow-card transition-shadow hover:shadow-md"
                        >
                          <bdi dir="ltr" className="w-12 shrink-0 pt-0.5 text-sm font-semibold tabular-nums">{r.slot.start}</bdi>
                          <span className="min-w-0 flex-1 space-y-0.5">
                            <span className="flex flex-wrap items-center gap-x-2 text-sm">
                              <bdi dir="ltr" className="font-bold">{classById.get(r.slot.classId)?.displayName}</bdi>
                              <span className="text-muted">{subjectById(taxonomy, r.slot.subjectId)?.label[locale]}</span>
                            </span>
                            {isBlank(shown) ? (
                              <span className="block text-sm text-muted/80">{t("empty")}</span>
                            ) : (
                              <>
                                <span className={cn("block font-semibold", suggested && "text-ink/80")}>{[shown.activity, shown.title].filter(Boolean).join(": ") || shown.unit}</span>
                                {shown.objective && <span className="line-clamp-2 block text-sm text-muted">{shown.objective}</span>}
                              </>
                            )}
                          </span>
                          {suggested ? (
                            <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">{t("suggested")}</span>
                          ) : !isBlank(r.entry) ? (
                            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[r.entry.status])}>{t(`statuses.${r.entry.status}`)}</span>
                          ) : (
                            <NotebookPen aria-hidden className="size-4 shrink-0 text-muted" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* ── الطباعة: صفحة لكل يوم (A4 أفقي) بنموذج الدفتر اليومي العربي أو الفرنسي ── */}
      <div className="hidden print:block">
        <style>{"@page { size: A4 landscape; margin: 8mm; }"}</style>
        {printDays.map((date) => {
          const rows = rowsOf(date);
          if (!rows.length) return null;
          const french = rows.every((r) => r.slot.subjectId === "fr");
          const shown = rows.map((r) => ({ ...r, e: effective(r) }));
          const periods = (["am", "pm"] as const).map((p) => ({ p, rows: shown.filter((r) => periodOf(r.slot.start) === p) })).filter((x) => x.rows.length);
          const notes = shown.map((r) => r.entry.notes).filter(Boolean).join(" — ");
          const prep = shown.find((r) => r.sug?.entry.k === "day")?.sug?.entry;
          const weekNo = schoolWeekOf(date, yearStart, cal.schoolDays, cal.holidays);
          const dateObj = new Date(`${date}T12:00:00`);
          const cell = "border border-ink px-1.5 py-1";

          if (french) {
            const seq = shown.find((r) => r.e.seq)?.e.seq ?? "";
            return (
              <section key={date} dir="ltr" lang="fr" className="break-after-page text-[10pt] last:break-after-auto">
                <h1 className="mb-1 text-center text-[13pt] font-bold">{FR.title}</h1>
                <div className="mb-2 grid grid-cols-3 gap-4">
                  <p><b>{FR.date} :</b> {formatLongDate(dateObj, "fr")}</p>
                  <p><b>{FR.project} :</b> ......................................</p>
                  <p><b>{FR.sequence} :</b> {seq || "......................................"}</p>
                </div>
                {periods.map(({ p, rows: pr }) => (
                  <table key={p} className="mb-3 w-full border-collapse">
                    <caption className="pb-1 text-center text-[11pt] font-bold">{p === "am" ? FR.morning : FR.afternoon}</caption>
                    <thead>
                      <tr className="bg-canvas">
                        {[FR.horaire, FR.duree, ...(multiClass ? ["Classe"] : []), FR.activites, FR.composantes, FR.objectifs].map((h) => (
                          <th key={h} className={`${cell} text-center font-semibold`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pr.map(({ slot, key, e }) => (
                        <tr key={key} className="break-inside-avoid align-top">
                          <td className={`${cell} w-24 whitespace-nowrap text-center`}>{slot.start} – {slot.end}</td>
                          <td className={`${cell} w-14 text-center`}>{durationMinutes(slot.start, slot.end)} min</td>
                          {multiClass && <td className={cell}>{classById.get(slot.classId)?.displayName}</td>}
                          <td className={`${cell} w-[24%]`} dir="auto">{[e.activity, e.title].filter(Boolean).join(" : ")}</td>
                          <td className={`${cell} w-[24%]`} dir="auto">{e.unit}</td>
                          <td className={`${cell} h-12`} dir="auto">{e.objective}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ))}
                <p className="mt-3"><b>{FR.remarks} :</b> {notes || "................................................................................................................"}</p>
                <div className="mt-4 flex justify-between gap-6">
                  <p><b>{FR.seen} :</b> ....................................</p>
                  <p><b>{FR.sign} :</b> ....................................</p>
                </div>
              </section>
            );
          }

          return (
            <section key={date} dir="rtl" lang="ar" className="break-after-page text-[10pt] last:break-after-auto">
              <div className="mb-2 flex flex-wrap justify-between gap-x-6 gap-y-1">
                <p><b>{t("day")}:</b> {formatLongDate(dateObj, "ar")}</p>
                {formatHijri(date) && <p><b>{t("hijri")}:</b> {formatHijri(date)}</p>}
                <p>
                  <b>
                    {prep
                      ? t("prepWeek", { w: Math.ceil(prep.u / 5), d: ((prep.u - 1) % 5) + 1 })
                      : weekNo > 0
                        ? t("schoolWeek", { n: weekNo })
                        : ""}
                  </b>
                </p>
              </div>
              {periods.map(({ p, rows: pr }) => (
                <table key={p} className="mb-3 w-full border-collapse">
                  <caption className="pb-1 text-center text-[11pt] font-bold">{t(p === "am" ? "morning" : "afternoon")}</caption>
                  <thead>
                    <tr className="bg-canvas">
                      <th colSpan={2} className={`${cell} text-center font-semibold`}>{t("time")}</th>
                      {multiClass && <th rowSpan={2} className={`${cell} text-center font-semibold`}>{t("class")}</th>}
                      {(["activity", "unit", "title", "objective"] as const).map((f) => (
                        <th key={f} rowSpan={2} className={`${cell} text-center font-semibold`}>{t(`fields.${f}`)}</th>
                      ))}
                      {(["seq", "week", "session"] as const).map((f) => (
                        <th key={f} rowSpan={2} className={`${cell} text-center font-semibold`}>{t(`meta.${f}`)}</th>
                      ))}
                    </tr>
                    <tr className="bg-canvas">
                      <th className={`${cell} text-center font-semibold`}>{t("from")}</th>
                      <th className={`${cell} text-center font-semibold`}>{t("to")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pr.map(({ slot, key, e }) => (
                      <tr key={key} className="break-inside-avoid align-top">
                        <td className={`${cell} w-12 text-center tabular-nums`}><bdi dir="ltr">{slot.start}</bdi></td>
                        <td className={`${cell} w-12 text-center tabular-nums`}><bdi dir="ltr">{slot.end}</bdi></td>
                        {multiClass && <td className={cell}><bdi dir="ltr">{classById.get(slot.classId)?.displayName}</bdi></td>}
                        <td className={`${cell} w-[12%]`}><bdi>{e.activity || subjectById(taxonomy, slot.subjectId)?.label.ar}</bdi></td>
                        <td className={`${cell} w-[11%]`}><bdi>{e.unit}</bdi></td>
                        <td className={`${cell} w-[15%]`}><bdi>{e.title}</bdi></td>
                        <td className={`${cell} h-12`}><bdi>{e.objective}</bdi></td>
                        <td className={`${cell} w-[10%]`}><bdi>{e.seq}</bdi></td>
                        <td className={`${cell} w-12 text-center`}><bdi>{e.week}</bdi></td>
                        <td className={`${cell} w-12 text-center`}><bdi>{e.session}</bdi></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
              <p className="mt-3"><b>{t("remarks")}:</b> {notes || "................................................................................................................................................"}</p>
              <div className="mt-5 flex justify-between gap-6">
                <p><b>{t("directorSeen")}:</b> ....................................</p>
                <p><b>{t("signature")}:</b> ....................................</p>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

async function fetchSummary(id: string): Promise<LessonSummary | null> {
  try {
    const snap = await getDoc(doc(getFirebase().db, "lessonSummaries", id));
    return snap.exists() ? (snap.data() as LessonSummary) : null;
  } catch {
    return null;
  }
}

function LessonEditor({
  row,
  initial,
  cls,
  taxonomy,
  onSave,
  onCancel,
}: {
  row: Row;
  initial: LessonEntry;
  cls?: ClassDoc;
  taxonomy: StageTaxonomy;
  onSave: (e: LessonEntry) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useTranslations("logbook.daily");
  const locale = useLocale() as "ar" | "fr";
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const uid = useUid();
  const { slot, sug, entry } = row;
  const preps = useQuery({ queryKey: ["preps", uid ?? ""], queryFn: () => listPreps(uid!), enabled: !!uid, staleTime: 60_000 });
  const matching = (preps.data ?? []).filter((p) => p.subjectId === slot.subjectId);

  // حصص أسبوع المنهاج الحالي والمجاور له (للاختيار السريع للموضوع)
  const weeks = sug ? curriculumWeeks(sug.curriculum.entries) : [];
  const nearby = sug ? weeks.slice(Math.max(0, sug.schoolWeek - 2), sug.schoolWeek + 1).flatMap((w) => w.entries) : [];
  const activities = [...new Set([...(cls?.subjectIds ?? []).map((s) => subjectById(taxonomy, s)?.label[locale] ?? ""), ...(sug?.curriculum.entries.map((e) => e.a) ?? [])])].filter(Boolean);
  const domains = [...new Set(sug?.curriculum.entries.map((e) => e.d) ?? [])];
  const listId = `dl-${row.key}`;

  async function pickLesson(id: string) {
    const e = sug?.curriculum.entries.find((x) => x.id === id);
    if (!sug || !e) return;
    const summary = await queryClient.fetchQuery({ queryKey: ["lessonSummary", id], queryFn: () => fetchSummary(id), staleTime: 60 * 60_000 });
    setDraft({ ...suggestionToEntry({ ...sug, entry: e, summary }, draft), notes: draft.notes, status: draft.status });
  }

  async function submit(next: LessonEntry) {
    setState("saving");
    try {
      await onSave(next);
    } catch {
      setState("error");
    }
  }

  const input = "block w-full resize-y rounded-xl border border-line bg-surface px-3 py-2.5 outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100";

  return (
    <Card className="space-y-3 ring-2 ring-brand-200">
      <p className="text-sm">
        <bdi dir="ltr" className="font-semibold tabular-nums">{slot.start}–{slot.end}</bdi> · <bdi dir="ltr" className="font-bold">{cls?.displayName}</bdi> ·{" "}
        {subjectById(taxonomy, slot.subjectId)?.label[locale]}
      </p>
      {nearby.length > 0 && (
        <label className="block space-y-1">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <BookOpenCheck aria-hidden className="size-4 text-brand-700" />
            {t("pickLesson")}
          </span>
          <select value={draft.ref ?? ""} onChange={(e) => pickLesson(e.target.value)} className={cn(input, "min-h-11")}>
            <option value="">—</option>
            {nearby.map((e) => (
              <option key={e.id} value={e.id}>
                {e.k === "day" ? t("dayN", { n: e.u }) : t("weekN", { n: e.u })} · {e.a}: {e.t}
              </option>
            ))}
          </select>
        </label>
      )}
      {matching.length > 0 && (
        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("fromPrep")}</span>
          <select
            value=""
            onChange={(e) => {
              const p = matching.find((x) => x.id === e.target.value);
              if (p) setDraft({ ...draft, activity: p.activity, unit: p.domain, title: p.content, objective: p.objective, materials: p.materials, seq: p.sequence, week: p.week, session: p.session });
            }}
            className={cn(input, "min-h-11")}
          >
            <option value="">—</option>
            {matching.map((p) => (
              <option key={p.id} value={p.id}>{prepTitle(p) || p.domain}{p.week ? ` · ${p.week}` : ""}</option>
            ))}
          </select>
        </label>
      )}
      <datalist id={`${listId}-a`}>{activities.map((a) => <option key={a} value={a} />)}</datalist>
      <datalist id={`${listId}-d`}>{domains.map((d) => <option key={d} value={d} />)}</datalist>
      {LESSON_TEXT_FIELDS.map((f) =>
        f === "activity" || f === "unit" ? (
          <label key={f} className="block space-y-1">
            <span className="text-sm font-medium">{t(`fields.${f}`)}</span>
            <input
              value={draft[f]}
              onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
              list={`${listId}-${f === "activity" ? "a" : "d"}`}
              placeholder={t(`placeholders.${f}`)}
              maxLength={FIELD_MAX[f]}
              dir="auto"
              className={cn(input, "min-h-11")}
            />
          </label>
        ) : (
          <label key={f} className="block space-y-1">
            <span className="text-sm font-medium">{t(`fields.${f}`)}</span>
            <textarea
              value={draft[f]}
              onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
              placeholder={t(`placeholders.${f}`)}
              maxLength={FIELD_MAX[f]}
              rows={f === "notes" || f === "objective" || f === "materials" ? 2 : 1}
              dir="auto"
              className={input}
            />
          </label>
        ),
      )}
      <div className="grid grid-cols-3 gap-2">
        {LESSON_META_FIELDS.map((f) => (
          <label key={f} className="block space-y-1">
            <span className="text-sm font-medium">{t(`meta.${f}`)}</span>
            <input value={draft[f] ?? ""} onChange={(e) => setDraft({ ...draft, [f]: e.target.value })} maxLength={META_MAX[f]} dir="auto" className={cn(input, "min-h-11")} />
          </label>
        ))}
      </div>
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
        {draft.ref && (
          <Link href={`/app/lessons/${draft.ref}`} className={buttonClass("ghost")}>
            <BookOpenCheck aria-hidden className="size-4" />
            {t("openLesson")}
          </Link>
        )}
        {!isBlank(entry) && (
          <button
            type="button"
            onClick={() => submit({ ...draft, activity: "", unit: "", title: "", objective: "", materials: "", notes: "", seq: "", week: "", session: "", ref: "" })}
            className={buttonClass("ghost", "md", "ms-auto text-red-700")}
          >
            {t("clear")}
          </button>
        )}
      </div>
    </Card>
  );
}
