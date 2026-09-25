"use client";

import { useState } from "react";
import Link from "next/link";
import { flushSync } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Check, ClipboardPaste, LoaderCircle, Pencil, Plus, Printer, Search, Trash2 } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { useClass, useTaxonomy, useTeacher, useUid } from "@/features/classes/hooks";
import { todayInAlgiers } from "@/features/attendance/logic";
import { useCalendar } from "@/features/schedule/repo";
import { PrintHeader } from "@/features/logbook/print-header";
import { parseAcademicYearId } from "@/shared/academic-year";
import { subjectById } from "@/shared/taxonomy/taxonomy";
import { cn } from "@/lib/utils/cn";
import { defaultStart, parseProgression, progressStatus, ROW_MAX, schoolWeekOf, weekStart, type Progression, type ProgressionRow } from "./logic";
import { getProgression, saveProgression } from "./repo";
import { STATUS_STYLE } from "./planning-overview";

export function ProgressionEditor({ classId, subjectId }: { classId: string; subjectId: string }) {
  const uid = useUid();
  const teacher = useTeacher();
  const cls = useClass(classId);
  const calendar = useCalendar();
  const tax = useTaxonomy(teacher.data?.profile.stage);
  const prog = useQuery({ queryKey: ["progression", uid ?? "", classId, subjectId], queryFn: () => getProgression(uid!, classId, subjectId), enabled: !!uid });

  if (!teacher.data || !cls.data || !calendar.data || !tax.data || prog.data === undefined) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  const startYear = parseAcademicYearId(teacher.data.profile.activeYearId)?.startYear ?? new Date().getFullYear();
  const initial: Progression = prog.data ?? { classId, subjectId, startDate: defaultStart(startYear), rows: [] };
  return <Editor key={`${classId}-${subjectId}`} initial={initial} className={cls.data.displayName} subjectLabel={subjectById(tax.data, subjectId)?.label} />;
}

function Editor({ initial, className, subjectLabel }: { initial: Progression; className: string; subjectLabel?: { ar: string; fr: string } }) {
  const t = useTranslations("planning");
  const locale = useLocale() as "ar" | "fr";
  const uid = useUid();
  const queryClient = useQueryClient();
  const cal = useCalendar().data!;
  const [p, setP] = useState<Progression>(initial);
  const [editing, setEditing] = useState(initial.rows.length === 0);
  const [pasting, setPasting] = useState(false);
  const [paste, setPaste] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [printMode, setPrintMode] = useState<"annual" | "monthly">("annual");
  const subject = subjectLabel?.[locale] ?? p.subjectId;
  const currentWeek = schoolWeekOf(todayInAlgiers(), p.startDate, cal.schoolDays, cal.holidays);
  const status = progressStatus(p.rows, currentWeek);
  const weekDate = (w: number) => weekStart(w, p.startDate, cal.schoolDays, cal.holidays);

  async function persist(next: Progression) {
    if (!uid) return;
    // عرض فوري (العلامة تظهر حالًا)، ثم الحفظ — يعمل دون إنترنت أيضًا عبر كاش Firestore
    setP(next);
    setState("saving");
    try {
      const rows = await saveProgression(uid, next);
      const saved = { ...next, rows };
      setP(saved);
      queryClient.setQueryData(["progression", uid, next.classId, next.subjectId], saved);
      await queryClient.invalidateQueries({ queryKey: ["progressions", uid] });
      setState("saved");
    } catch {
      setState("error");
    }
  }

  const setRow = (i: number, patch: Partial<ProgressionRow>) => {
    setP((cur) => ({ ...cur, rows: cur.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
    setState("idle");
  };
  const parsed = parseProgression(paste);

  function print(mode: "annual" | "monthly") {
    flushSync(() => setPrintMode(mode));
    window.print();
  }

  // تجميع شهري: كل سطر في شهر أحد أسبوعه
  const months = new Map<string, ProgressionRow[]>();
  for (const r of p.rows) {
    const m = weekDate(r.w).slice(0, 7);
    months.set(m, [...(months.get(m) ?? []), r]);
  }
  const monthName = (m: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : "fr-DZ", { month: "long", year: "numeric", numberingSystem: "latn" }).format(new Date(`${m}-15T12:00:00`));

  return (
    <>
      <div className="space-y-4 pb-4 print:hidden">
        <Card className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">{t("whereAmI")} · {currentWeek ? t("week", { n: currentWeek }) : t("beforeStart")}</p>
            {status.nextRow && <p dir="auto" className="truncate font-semibold">{t("next", { content: status.nextRow.content || status.nextRow.unit })}</p>}
            {status.total > 0 && <p className="text-sm text-muted">{t("progress", { done: status.doneCount, total: status.total })}</p>}
          </div>
          <span className={cn("rounded-full px-3 py-1 text-sm font-semibold", STATUS_STYLE[status.kind])}>{t(`status.${status.kind}`, { n: status.weeks })}</span>
        </Card>

        <div className="flex flex-wrap gap-2">
          {editing ? (
            <button type="button" onClick={() => persist(p).then(() => setEditing(false))} disabled={state === "saving"} className={buttonClass("primary")}>
              {state === "saving" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Check aria-hidden className="size-4" />}
              {t("save")}
            </button>
          ) : (
            <button type="button" onClick={() => setEditing(true)} className={buttonClass("secondary")}>
              <Pencil aria-hidden className="size-4" />
              {t("edit")}
            </button>
          )}
          <button type="button" onClick={() => setPasting((v) => !v)} className={buttonClass("secondary")}>
            <ClipboardPaste aria-hidden className="size-4" />
            {t("paste")}
          </button>
          {p.rows.length > 0 && (
            <>
              <button type="button" onClick={() => print("annual")} className={buttonClass("secondary")}>
                <Printer aria-hidden className="size-4" />
                {t("print")} · {t("annual")}
              </button>
              <button type="button" onClick={() => print("monthly")} className={buttonClass("secondary")}>
                <Printer aria-hidden className="size-4" />
                {t("monthly")}
              </button>
            </>
          )}
          <Link href="/app/library" className={buttonClass("ghost")}>
            <Search aria-hidden className="size-4" />
            {t("fromLibrary")}
          </Link>
        </div>
        {state === "error" && <p role="alert" className="text-sm text-red-700">{t("error")}</p>}

        {pasting && (
          <Card className="space-y-3">
            <p className="text-sm text-muted">{t("pasteHint")}</p>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={6}
              dir="auto"
              placeholder={t("pastePlaceholder")}
              aria-label={t("paste")}
              className="block w-full rounded-xl border border-line bg-surface px-4 py-3 font-mono text-sm outline-none focus:border-brand-600"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!parsed.length}
                onClick={() => {
                  void persist({ ...p, rows: [...p.rows, ...parsed] });
                  setPaste("");
                  setPasting(false);
                }}
                className={buttonClass("primary")}
              >
                {t("pasteAdd", { n: parsed.length })}
              </button>
              {p.rows.length > 0 && (
                <button
                  type="button"
                  disabled={!parsed.length}
                  onClick={() => {
                    void persist({ ...p, rows: parsed });
                    setPaste("");
                    setPasting(false);
                  }}
                  className={buttonClass("secondary")}
                >
                  {t("pasteReplace")}
                </button>
              )}
              <button type="button" onClick={() => setPasting(false)} className={buttonClass("ghost")}>{t("cancel")}</button>
            </div>
          </Card>
        )}

        {editing && (
          <Card className="space-y-1">
            <Field
              label={t("startDate")}
              hint={t("startHint")}
              type="date"
              value={p.startDate}
              onChange={(e) => e.target.value && setP({ ...p, startDate: e.target.value })}
              className="max-w-60"
            />
          </Card>
        )}

        {p.rows.length === 0 && !editing ? (
          <Card className="py-10 text-center text-muted">{t("empty")}</Card>
        ) : (
          <>
            {!editing && <p className="text-xs text-muted">{t("markHint")}</p>}
            <ol className="space-y-2">
              {p.rows.map((r, i) => {
                const current = r.w === currentWeek;
                return (
                  <li key={i} className={cn("rounded-card bg-surface p-3 shadow-card", current && "ring-2 ring-brand-300")}>
                    {editing ? (
                      <div className="grid grid-cols-[4.5rem_1fr_auto] items-start gap-2 sm:grid-cols-[4.5rem_12rem_1fr_auto]">
                        <input
                          type="number"
                          min={1}
                          max={40}
                          value={r.w}
                          aria-label={t("weekCol")}
                          onChange={(e) => setRow(i, { w: Number(e.target.value) })}
                          className="h-11 w-full min-w-0 rounded-xl border border-line bg-surface text-center outline-none focus:border-brand-600"
                        />
                        <input
                          value={r.unit}
                          maxLength={ROW_MAX.unit}
                          dir="auto"
                          placeholder={t("unit")}
                          aria-label={t("unit")}
                          onChange={(e) => setRow(i, { unit: e.target.value })}
                          className="col-span-1 h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand-600"
                        />
                        <button
                          type="button"
                          aria-label={t("remove")}
                          onClick={() => setP({ ...p, rows: p.rows.filter((_, j) => j !== i) })}
                          className="grid size-11 place-items-center rounded-full text-muted hover:text-red-700 sm:order-last"
                        >
                          <Trash2 aria-hidden className="size-4" />
                        </button>
                        <input
                          value={r.content}
                          maxLength={ROW_MAX.content}
                          dir="auto"
                          placeholder={t("content")}
                          aria-label={t("content")}
                          onChange={(e) => setRow(i, { content: e.target.value })}
                          className="col-span-3 h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand-600 sm:col-span-1"
                        />
                      </div>
                    ) : (
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={r.done}
                          onChange={(e) => void persist({ ...p, rows: p.rows.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)) })}
                          className="size-6 shrink-0 accent-brand-700"
                        />
                        <span className={cn("w-16 shrink-0 text-center text-xs font-semibold", current ? "text-brand-700" : "text-muted")}>
                          {current ? t("thisWeek") : t("week", { n: r.w })}
                        </span>
                        <span className={cn("min-w-0 flex-1", r.done && "text-muted line-through")}>
                          {r.unit && <span dir="auto" className="block text-xs text-muted">{r.unit}</span>}
                          <span dir="auto" className="block">{r.content}</span>
                        </span>
                      </label>
                    )}
                  </li>
                );
              })}
            </ol>
            {editing && (
              <button
                type="button"
                onClick={() => setP({ ...p, rows: [...p.rows, { w: (p.rows.at(-1)?.w ?? 0) + 1, unit: p.rows.at(-1)?.unit ?? "", content: "", done: false }] })}
                disabled={p.rows.length >= 200}
                className={buttonClass("secondary")}
              >
                <Plus aria-hidden className="size-4" />
                {t("addRow")}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── الطباعة ── */}
      <div className="hidden text-[10pt] print:block">
        <style>{"@page { size: A4 portrait; margin: 12mm; }"}</style>
        <PrintHeader
          title={t(printMode === "annual" ? "annualTitle" : "monthlyTitle", { subject })}
          subtitle={className}
        />
        {printMode === "annual" ? (
          <ProgressionTable rows={p.rows} weekDate={weekDate} />
        ) : (
          [...months].map(([m, rows]) => (
            <div key={m} className="mb-4 break-inside-avoid">
              <p className="mb-1 font-bold">{monthName(m)}</p>
              <ProgressionTable rows={rows} weekDate={weekDate} />
            </div>
          ))
        )}
      </div>
    </>
  );
}

function ProgressionTable({ rows, weekDate }: { rows: ProgressionRow[]; weekDate: (w: number) => string }) {
  const t = useTranslations("planning");
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-canvas">
          <th className="w-16 border border-ink px-1 py-1">{t("weekCol")}</th>
          <th className="w-24 border border-ink px-1 py-1" />
          <th className="w-[28%] border border-ink px-2 py-1">{t("unit")}</th>
          <th className="border border-ink px-2 py-1">{t("content")}</th>
          <th className="w-12 border border-ink px-1 py-1">{t("done")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="break-inside-avoid">
            <td className="border border-ink text-center">{r.w}</td>
            <td className="border border-ink text-center"><bdi dir="ltr">{weekDate(r.w).split("-").reverse().slice(0, 2).join("/")}</bdi></td>
            <td className="border border-ink px-2 py-1"><bdi>{r.unit}</bdi></td>
            <td className="border border-ink px-2 py-1"><bdi>{r.content}</bdi></td>
            <td className="border border-ink text-center">{r.done ? "✓" : ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
