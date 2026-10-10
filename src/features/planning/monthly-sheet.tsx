"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Check, ClipboardCheck, LoaderCircle, Pencil, Plus, Printer, Puzzle, TreePalm } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useClasses, useTaxonomy, useTeacher, useUid } from "@/features/classes/hooks";
import { todayInAlgiers } from "@/features/attendance/logic";
import { useCalendar } from "@/features/schedule/repo";
import { PrintHeader } from "@/features/logbook/print-header";
import { getCurriculum } from "@/features/lessons/repo";
import { curriculumId } from "@/features/lessons/logic";
import { parseAcademicYearId } from "@/shared/academic-year";
import { levelById, subjectById } from "@/shared/taxonomy/taxonomy";
import { monthName } from "@/i18n/dates";
import { cn } from "@/lib/utils/cn";
import { defaultStart, progressionId, rowsFromCurriculum, schoolWeekOf, type Progression, type ProgressionRow } from "./logic";
import { listProgressions, saveProgression } from "./repo";
import { AR_COLUMNS, arabicWeek, cellItems, inferColumns, monthWeeks, replaceCell, schoolMonths, yearWeeks, type CellCol, type MonthWeek } from "./monthly";
import { CellEditor } from "./cell-editor";
import { EditTip } from "./edit-tip";

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const dmy = (iso: string) => `${dm(iso)}/${iso.slice(0, 4)}`;

/** «أكتوبر 2026» / « octobre 2026 » */
export function useMonthLabel() {
  const locale = useLocale() as "ar" | "fr";
  return (month: string) => `${monthName(Number(month.slice(5, 7)), locale)} ${month.slice(0, 4)}`;
}

/** الفرنسية والإنجليزية تُكتبان من اليسار، وبقية المواد بالعربية. */
export const subjectDir = (subjectId: string): "rtl" | "ltr" => (subjectId === "fr" || subjectId === "en" ? "ltr" : "rtl");

/* لون لكل مادة (رأس العمود، شريطه، خلفية خاناته، نقاط عناصره) — أصناف ثابتة ليلتقطها Tailwind. */
type Tone = { head: string; bar: string; tint: string; dot: string };
const TONES: Record<string, Tone> = {
  ar: { head: "bg-emerald-100 text-emerald-950", bar: "border-t-emerald-500", tint: "bg-emerald-50/60", dot: "bg-emerald-500" },
  fr: { head: "bg-indigo-100 text-indigo-950", bar: "border-t-indigo-500", tint: "bg-indigo-50/60", dot: "bg-indigo-500" },
  en: { head: "bg-fuchsia-100 text-fuchsia-950", bar: "border-t-fuchsia-500", tint: "bg-fuchsia-50/60", dot: "bg-fuchsia-500" },
  math: { head: "bg-sky-100 text-sky-950", bar: "border-t-sky-500", tint: "bg-sky-50/60", dot: "bg-sky-500" },
  islamic: { head: "bg-teal-100 text-teal-950", bar: "border-t-teal-500", tint: "bg-teal-50/60", dot: "bg-teal-500" },
  science: { head: "bg-violet-100 text-violet-950", bar: "border-t-violet-500", tint: "bg-violet-50/60", dot: "bg-violet-500" },
  civic: { head: "bg-orange-100 text-orange-950", bar: "border-t-orange-500", tint: "bg-orange-50/60", dot: "bg-orange-500" },
  history: { head: "bg-rose-100 text-rose-950", bar: "border-t-rose-500", tint: "bg-rose-50/60", dot: "bg-rose-500" },
  geography: { head: "bg-amber-100 text-amber-950", bar: "border-t-amber-500", tint: "bg-amber-50/60", dot: "bg-amber-500" },
  art: { head: "bg-pink-100 text-pink-950", bar: "border-t-pink-500", tint: "bg-pink-50/60", dot: "bg-pink-500" },
  music: { head: "bg-purple-100 text-purple-950", bar: "border-t-purple-500", tint: "bg-purple-50/60", dot: "bg-purple-500" },
  pe: { head: "bg-lime-100 text-lime-950", bar: "border-t-lime-500", tint: "bg-lime-50/60", dot: "bg-lime-600" },
};
const DEFAULT_TONE: Tone = { head: "bg-slate-100 text-slate-900", bar: "border-t-slate-400", tint: "bg-slate-50/60", dot: "bg-slate-400" };
export const toneOf = (subjectId: string) => TONES[subjectId] ?? DEFAULT_TONE;

type Editing = { subject: string; n: number; col: CellCol };
type PlanEntry = { official: ProgressionRow[]; rows: ProgressionRow[]; saved?: Progression };

export function MonthlySheet({ month: monthParam, classId: classParam }: { month?: string; classId?: string }) {
  const t = useTranslations("planning.monthlyPlan");
  const locale = useLocale() as "ar" | "fr";
  const monthLabel = useMonthLabel();
  const uid = useUid();
  const queryClient = useQueryClient();
  const teacher = useTeacher();
  const classes = useClasses();
  const calendar = useCalendar();
  const tax = useTaxonomy(teacher.data?.profile.stage);
  const progs = useQuery({ queryKey: ["progressions", uid ?? ""], queryFn: () => listProgressions(uid!), enabled: !!uid });
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const active = (classes.data ?? []).filter((c) => !c.archived);
  const cls = active.find((c) => c.id === classParam) ?? active[0];
  // مواد القسم المقرّرة لمستواه، بترتيب التصنيف (العربية أولًا ثم الرياضيات…)
  const subjects = cls && tax.data ? tax.data.subjects.filter((s) => cls.subjectIds.includes(s.id) && s.levels.includes(cls.level)).map((s) => s.id) : [];
  const curricula = useQueries({
    queries: subjects.map((s) => ({ queryKey: ["curriculum", curriculumId(cls!.level, s)], queryFn: () => getCurriculum(curriculumId(cls!.level, s)), staleTime: 60 * 60_000 })),
  });

  if (!teacher.data || !classes.data || !calendar.data || !tax.data || !progs.data || curricula.some((q) => q.isLoading)) {
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
  const today = todayInAlgiers();
  const currentWeek = schoolWeekOf(today, start, cal.schoolDays, cal.holidays);
  const months = schoolMonths(start, cal);
  const month = months.includes(monthParam ?? "") ? monthParam! : months.includes(today.slice(0, 7)) ? today.slice(0, 7) : today < `${months[0]}-01` ? months[0]! : months.at(-1)!;
  const weeks = monthWeeks(month, start, cal);
  const allWeeks = yearWeeks(start, cal);
  const href = (m: string, c = cls.id) => `/app/planning/monthly?m=${m}&c=${c}`;
  const levelLabel = levelById(tax.data, cls.level)?.label[locale] ?? cls.level;

  // لكل مادة: التوزيع المحفوظ للأستاذ، وإلا الرسمي من المذكرات (نفس «أين أنا الآن؟»)
  const savedById = new Map(progs.data.map((p) => [progressionId(p.classId, p.subjectId), p]));
  const plan = new Map<string, PlanEntry>(
    subjects.map((s, i) => {
      const cur = curricula[i]?.data;
      const official = cur?.entries.length ? rowsFromCurriculum({ ...cur, subject: s }, currentWeek) : [];
      const saved = savedById.get(progressionId(cls.id, s));
      const rows = saved ? (s === "ar" ? inferColumns(saved.rows, official) : saved.rows) : official;
      return [s, { official, rows, saved }];
    }),
  );
  const subjectLabel = (s: string) => subjectById(tax.data!, s)?.label[locale] ?? s;

  // العطل والاختبارات التي تمسّ الشهر
  const holidays = cal.holidays.filter((h) => h.start.slice(0, 7) <= month && month <= h.end.slice(0, 7));
  const exams = (cal.exams ?? []).map((e) => ({ term: e.term, days: e.days.filter((d) => d.startsWith(month)) })).filter((e) => e.days.length);

  async function save(e: Editing, items: string[], target: number) {
    if (!uid || !cls) return;
    const entry = plan.get(e.subject)!;
    const startDate = entry.saved?.startDate ?? start;
    setSaving(true);
    setSaveError(false);
    try {
      const rows = await saveProgression(uid, { classId: cls.id, subjectId: e.subject, startDate, rows: replaceCell(entry.rows, e.n, e.col, items, target) });
      const doc: Progression = { classId: cls.id, subjectId: e.subject, startDate, rows };
      const id = progressionId(cls.id, e.subject);
      queryClient.setQueryData<Progression[]>(["progressions", uid], (old) => [...(old ?? []).filter((p) => progressionId(p.classId, p.subjectId) !== id), doc]);
      queryClient.setQueryData(["progression", uid, cls.id, e.subject], doc);
      setEditing(null);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  const editingEntry = editing ? plan.get(editing.subject) : undefined;
  const editingWeek = editing ? allWeeks.find((w) => w.n === editing.n) : undefined;

  return (
    <div className="space-y-4 [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
      <style>{"@page { size: A4 landscape; margin: 7mm; }"}</style>

      {/* ── الرأس ── */}
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

        <section className="overflow-hidden rounded-3xl bg-linear-to-br from-brand-950 via-brand-800 to-brand-600 p-5 text-white shadow-card">
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-[14rem] flex-1">
              <p className="text-sm text-white/75">{t("eyebrow")}</p>
              <p className="text-3xl font-bold">{monthLabel(month)}</p>
              <p className="mt-1 text-white/85">
                {levelLabel} · <bdi dir="ltr">{cls.displayName}</bdi>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={editMode}
                onClick={() => setEditMode((v) => !v)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors",
                  editMode ? "bg-amber-300 text-amber-950 hover:bg-amber-200" : "bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25",
                )}
              >
                {editMode ? <Check aria-hidden className="size-4" /> : <Pencil aria-hidden className="size-4" />}
                {editMode ? t("doneEditing") : t("edit")}
              </button>
              <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-brand-900 hover:bg-brand-50">
                <Printer aria-hidden className="size-4" />
                {t("print")}
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white/15 px-3 py-1">{t("weeksCount", { n: weeks.length })}</span>
            {exams.map((e) => (
              <span key={e.term} className="inline-flex items-center gap-1 rounded-full bg-rose-200 px-3 py-1 text-rose-950">
                <ClipboardCheck aria-hidden className="size-3.5" />
                {t("exams", { term: e.term })}
              </span>
            ))}
            {holidays.map((h) => (
              <span key={h.start} className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-3 py-1 text-amber-950">
                <TreePalm aria-hidden className="size-3.5" />
                {h.label?.[locale] ?? t("holidayName")}
              </span>
            ))}
          </div>
        </section>

        {/* الأشهر */}
        <nav aria-label={t("months")} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {months.map((m) => (
            <Link
              key={m}
              href={href(m)}
              aria-current={m === month ? "page" : undefined}
              className={cn("relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold", m === month ? "bg-ink text-white" : "bg-surface text-ink ring-1 ring-line hover:bg-brand-50")}
            >
              {monthName(Number(m.slice(5, 7)), locale)}
              {m === today.slice(0, 7) && <span aria-hidden className="absolute end-1.5 top-1.5 size-1.5 rounded-full bg-brand-400" />}
            </Link>
          ))}
        </nav>

        <EditTip id="monthly-edit" title={t("tipTitle")}>{t("tipBody")}</EditTip>
        {editMode && <p role="status" className="rounded-2xl bg-amber-100 px-4 py-2 text-sm font-medium text-amber-950">{t("editModeHint")}</p>}
      </div>

      {/* ── الجدول (الشاشة والطباعة) ── */}
      <div className="text-[9pt] print:text-[7pt] print:leading-tight">
        <div className="hidden print:block">
          <PrintHeader title={t("sheetTitle", { month: monthLabel(month) })} subtitle={`${levelLabel} — ${cls.displayName}`} />
        </div>
        {weeks.length === 0 ? (
          <Card className="py-10 text-center text-muted">{t("noWeeks")}</Card>
        ) : (
          <div className="overflow-x-auto rounded-3xl bg-surface shadow-card ring-1 ring-line print:overflow-visible print:rounded-none print:shadow-none print:ring-0">
            <table className="w-full min-w-max border-separate border-spacing-0 print:min-w-0 print:border-s print:border-t print:border-line">
              <thead>
                <tr>
                  <th rowSpan={2} scope="col" className="sticky start-0 z-20 w-28 border-e border-b border-line bg-ink px-2 py-2 text-white print:static">
                    {t("weeks")}
                  </th>
                  {subjects.map((s) => {
                    const tone = toneOf(s);
                    return (
                      <th
                        key={s}
                        scope="col"
                        colSpan={s === "ar" ? AR_COLUMNS.length : 1}
                        rowSpan={s === "ar" ? 1 : 2}
                        className={cn("border-e border-b border-t-4 border-line px-1.5 py-2 text-center font-bold", s !== "ar" && "min-w-36 print:min-w-0", tone.head, tone.bar)}
                      >
                        {subjectLabel(s)}
                      </th>
                    );
                  })}
                </tr>
                <tr>
                  {subjects.includes("ar") &&
                    AR_COLUMNS.map((k) => (
                      <th key={k} scope="col" className="min-w-36 border-e border-b border-line bg-emerald-50 px-1 py-1.5 text-center text-[0.9em] font-semibold text-emerald-900 print:min-w-0">
                        {t(k)}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <WeekRow
                    key={w.n}
                    week={w}
                    current={w.n === currentWeek}
                    subjects={subjects}
                    plan={plan}
                    editMode={editMode}
                    subjectLabel={subjectLabel}
                    onEdit={(e) => {
                      setSaveError(false);
                      setEditing(e);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* الرزنامة والمفتاح */}
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3 print:mt-1">
          {(holidays.length > 0 || exams.length > 0) && (
            <div className="break-inside-avoid space-y-0.5">
              <p className="font-semibold">{t("calendarNote")}</p>
              {exams.map((e) => (
                <p key={`e${e.term}`} className="text-rose-800">
                  • {t("exams", { term: e.term })}: <bdi dir="ltr">{e.days.map(dm).join(" ، ")}</bdi>
                </p>
              ))}
              {holidays.map((h) => (
                <p key={h.start} className="text-amber-900">• {t("holiday", { name: h.label?.[locale] ?? t("holidayName"), from: dmy(h.start), to: dmy(h.end) })}</p>
              ))}
            </div>
          )}
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted print:hidden">
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full bg-amber-500" />
              {t("legendEdited")}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-full ring-2 ring-brand-500" />
              {t("legendCurrent")}
            </li>
          </ul>
        </div>
        <p className="mt-2 text-xs text-muted print:hidden">{t("source")}</p>

        <div className="mt-6 hidden break-inside-avoid grid-cols-3 text-center font-semibold print:mt-3 print:grid">
          <p>{t("signTeacher")}</p>
          <p>{t("signDirector")}</p>
          <p>{t("signInspector")}</p>
        </div>
      </div>

      {editing && editingEntry && (
        <CellEditor
          key={`${editing.subject}-${editing.n}-${editing.col}`}
          title={`${subjectLabel(editing.subject)}${editing.col && editing.col !== "all" ? ` — ${t(editing.col)}` : ""}`}
          subtitle={`${t("schoolWeek", { n: editing.n })}${editingWeek ? ` · ${dm(editingWeek.days[0]!)} – ${dm(editingWeek.days.at(-1)!)}` : ""}`}
          dir={subjectDir(editing.subject)}
          dotClass={toneOf(editing.subject).dot}
          initial={cellItems(editingEntry.rows, editing.n, editing.col)}
          official={cellItems(editingEntry.official, editing.n, editing.col)}
          week={editing.n}
          weeks={allWeeks.map((w) => ({ n: w.n, label: `${t("schoolWeek", { n: w.n })} · ${dm(w.days[0]!)}` }))}
          saving={saving}
          error={saveError}
          onSave={(items, target) => void save(editing, items, target)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function WeekRow({ week: w, current, subjects, plan, editMode, subjectLabel, onEdit }: {
  week: MonthWeek;
  current: boolean;
  subjects: string[];
  plan: Map<string, PlanEntry>;
  editMode: boolean;
  subjectLabel: (s: string) => string;
  onEdit: (e: Editing) => void;
}) {
  const t = useTranslations("planning.monthlyPlan");
  const locale = useLocale() as "ar" | "fr";
  const hasContent = subjects.some((s) => plan.get(s)!.rows.some((r) => r.w === w.n));
  const examOnly = w.exams.length > 0 && w.days.every((d) => w.exams.some((e) => e.days.includes(d))) && !hasContent;
  const span = subjects.length + (subjects.includes("ar") ? AR_COLUMNS.length - 1 : 0);
  const border = "border-e border-b border-line";

  const cell = (s: string, col: CellCol, colSpan = 1, merged = false) => {
    const entry = plan.get(s)!;
    const items = cellItems(entry.rows, w.n, col);
    const edited = items.join("\n") !== cellItems(entry.official, w.n, col).join("\n");
    const tone = toneOf(s);
    const name = `${subjectLabel(s)}${col && col !== "all" ? ` — ${t(col)}` : ""}`;
    return (
      <td key={`${s}-${col}`} colSpan={colSpan} className={cn(border, "relative p-0 align-top", merged ? "bg-linear-to-br from-emerald-100 to-emerald-50" : tone.tint)}>
        <Cell
          items={items}
          dir={subjectDir(s)}
          dot={tone.dot}
          merged={merged}
          edited={edited}
          editMode={editMode}
          label={t("editCell", { subject: name, n: w.n })}
          onEdit={() => onEdit({ subject: s, n: w.n, col })}
        />
      </td>
    );
  };

  return (
    <tr className="break-inside-avoid">
      <th scope="row" className={cn(border, "sticky start-0 z-10 px-2 py-2 text-center align-top font-normal print:static", current ? "bg-brand-50" : "bg-surface")}>
        <span className={cn("mx-auto grid size-9 place-items-center rounded-full text-base font-bold text-white print:size-6 print:text-[9pt]", current ? "bg-brand-700 ring-4 ring-brand-200" : "bg-ink")}>
          {w.index}
        </span>
        <span className="mt-1 block text-[0.85em] font-semibold">{t("schoolWeek", { n: w.n })}</span>
        <bdi dir="ltr" className="block text-[0.85em] text-muted">
          {dm(w.days[0]!)} – {dm(w.days.at(-1)!)}
        </bdi>
        {current && <span className="mt-1 inline-block rounded-full bg-brand-700 px-2 py-0.5 text-[0.8em] font-semibold text-white print:hidden">{t("thisWeek")}</span>}
        {w.exams.map((e) => (
          <span key={e.term} className="mt-1 flex items-center justify-center gap-1 rounded-md bg-rose-100 px-1 py-0.5 text-[0.8em] font-semibold text-rose-900">
            <ClipboardCheck aria-hidden className="size-3 shrink-0" />
            {t("examsShort")}
          </span>
        ))}
        {w.holidays.map((h) => (
          <span key={h.start} className="mt-1 flex items-center justify-center gap-1 rounded-md bg-amber-100 px-1 py-0.5 text-[0.8em] font-semibold text-amber-900">
            <TreePalm aria-hidden className="size-3 shrink-0" />
            {h.label?.[locale] ?? t("holidayName")}
          </span>
        ))}
      </th>
      {examOnly ? (
        <td colSpan={span} className={cn(border, "bg-linear-to-br from-rose-100 to-rose-50 text-center align-middle")}>
          <span className="inline-flex items-center gap-2 text-lg font-bold text-rose-900 print:text-[10pt]">
            <ClipboardCheck aria-hidden className="size-6 print:size-4" />
            {t("exams", { term: w.exams[0]!.term })}
          </span>
        </td>
      ) : (
        subjects.map((s) => {
          if (s !== "ar") return cell(s, null);
          const ar = arabicWeek(plan.get(s)!.rows, w.n);
          if (ar.merged) return cell(s, "all", AR_COLUMNS.length, true);
          return AR_COLUMNS.map((k) => cell(s, k));
        })
      )}
    </tr>
  );
}

function Cell({ items, dir, dot, merged, edited, editMode, label, onEdit }: {
  items: string[];
  dir: "rtl" | "ltr";
  dot: string;
  merged: boolean;
  edited: boolean;
  editMode: boolean;
  label: string;
  onEdit: () => void;
}) {
  const t = useTranslations("planning.monthlyPlan");
  const body = !items.length ? (
    editMode ? (
      <span className="flex items-center justify-center gap-1 py-2 text-amber-700">
        <Plus aria-hidden className="size-4" />
        {t("add")}
      </span>
    ) : (
      <span className="block py-1 text-center text-muted/60">—</span>
    )
  ) : (
    <ul dir={dir} className={cn("space-y-1", merged && "font-semibold text-emerald-950")}>
      {items.map((x) => (
        <li key={x} className={cn("flex items-start gap-1.5", merged && "justify-center text-center")}>
          {merged ? (
            <Puzzle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-emerald-700" />
          ) : (
            <span aria-hidden className={cn("mt-[0.5em] size-1.5 shrink-0 rounded-full", dot)} />
          )}
          <span className="min-w-0">{x}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <>
      {edited && <span title={t("legendEdited")} className="absolute end-1 top-1 size-2 rounded-full bg-amber-500 print:hidden" />}
      {editMode ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={label}
          className="group relative block h-full min-h-14 w-full px-2 py-2 text-start outline-none ring-inset transition hover:bg-white/70 hover:ring-2 hover:ring-amber-400 focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          {body}
          <Pencil aria-hidden className="absolute bottom-1 end-1 size-3.5 text-amber-600 opacity-60 group-hover:opacity-100" />
        </button>
      ) : (
        <div className="px-2 py-2 print:px-1 print:py-0.5">{body}</div>
      )}
    </>
  );
}
