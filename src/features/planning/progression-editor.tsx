"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Check, ClipboardPaste, LoaderCircle, Pencil, Plus, Printer, RotateCcw, Search, Trash2 } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { useClass, useTaxonomy, useTeacher, useUid } from "@/features/classes/hooks";
import { todayInAlgiers } from "@/features/attendance/logic";
import { useCalendar } from "@/features/schedule/repo";
import { calendarForLevel } from "@/features/schedule/logic";
import { parseAcademicYearId } from "@/shared/academic-year";
import { levelById, subjectById } from "@/shared/taxonomy/taxonomy";
import { DOC, docLangOfSubject, docLevel } from "@/i18n/doc-lang";
import { cn } from "@/lib/utils/cn";
import { defaultStart, parseProgression, rowsFromCurriculum, progressStatus, ROW_MAX, schoolWeekOf, type Progression, type ProgressionRow } from "./logic";
import { deleteProgression, getProgression, saveProgression } from "./repo";
import { EditTip } from "./edit-tip";
import { subjectDir } from "./monthly-sheet";
import { useCurriculum } from "@/features/lessons/repo";
import { curriculumId } from "@/features/lessons/logic";
import { STATUS_STYLE } from "./planning-overview";

/** التوزيع المعروض لمادة قسم: المحفوظ للأستاذ، وإلا الرسمي المقترح من المذكرات المنشورة. null أثناء التحميل. */
export function useProgressionModel(classId: string, subjectId: string) {
  const uid = useUid();
  const teacher = useTeacher();
  const cls = useClass(classId);
  const calendar = useCalendar();
  const tax = useTaxonomy(teacher.data?.profile.stage);
  const prog = useQuery({ queryKey: ["progression", uid ?? "", classId, subjectId], queryFn: () => getProgression(uid!, classId, subjectId), enabled: !!uid });
  const curriculum = useCurriculum(cls.data ? curriculumId(cls.data.level, subjectId) : "");

  if (!teacher.data || !cls.data || !calendar.data || !tax.data || prog.data === undefined || (prog.data === null && curriculum.isLoading)) return null;
  const startYear = parseAcademicYearId(teacher.data.profile.activeYearId)?.startYear ?? new Date().getFullYear();
  // لا توزيع محفوظ: نقترح التوزيع الرسمي من المنهاج المنشور
  const startDate = defaultStart(startYear);
  const official = !prog.data && !!curriculum.data?.entries.length;
  const rows = official ? rowsFromCurriculum({ ...curriculum.data!, subject: subjectId }, schoolWeekOf(todayInAlgiers(), startDate, calendar.data.schoolDays, calendar.data.holidays)) : [];
  const lang = docLangOfSubject(subjectId);
  const level = levelById(tax.data, cls.data.level);
  return {
    initial: prog.data ?? ({ classId, subjectId, startDate, rows } as Progression),
    official,
    saved: !!prog.data,
    // «استرجاع التوزيع الرسمي» متاح لتوزيع محفوظ حين تتوفر مذكرات المادة
    canReset: !!prog.data && !!curriculum.data?.entries.length,
    className: cls.data.displayName,
    levelLabel: lang ? docLevel(level, lang, cls.data.level) : undefined,
    levelLocal: level?.label,
    subjectLabel: subjectById(tax.data, subjectId)?.label,
    calendar: calendarForLevel(calendar.data, cls.data.level),
  };
}

export function ProgressionEditor({ classId, subjectId }: { classId: string; subjectId: string }) {
  const m = useProgressionModel(classId, subjectId);
  if (!m) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  return (
    <Editor
      key={`${classId}-${subjectId}-${m.saved ? "saved" : "official"}`}
      initial={m.initial}
      official={m.official}
      canReset={m.canReset}
    />
  );
}

function Editor({ initial, official, canReset }: { initial: Progression; official: boolean; canReset: boolean }) {
  const t = useTranslations("planning");
  const uid = useUid();
  const queryClient = useQueryClient();
  const cal = useCalendar().data!;
  const [p, setP] = useState<Progression>(initial);
  const [editing, setEditing] = useState(initial.rows.length === 0);
  const [pasting, setPasting] = useState(false);
  const [paste, setPaste] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // العربية وبقية المواد من اليمين، والفرنسية والإنجليزية من اليسار
  const dir = subjectDir(p.subjectId);
  const tm = useTranslations("planning.monthlyPlan");
  // الفرنسية والإنجليزية: الأسابيع والحقول والوثيقة المطبوعة بلغة المادة
  const docLang = docLangOfSubject(p.subjectId);
  const D = docLang ? DOC[docLang] : null;
  const weekLabel = (n: number) => D?.week(n) ?? t("week", { n });

  async function reset() {
    if (!uid || !window.confirm(t("resetConfirm"))) return;
    setState("saving");
    try {
      await deleteProgression(uid, p.classId, p.subjectId);
      queryClient.setQueryData(["progression", uid, p.classId, p.subjectId], null);
      await queryClient.invalidateQueries({ queryKey: ["progressions", uid] });
    } catch {
      setState("error");
    }
  }
  const currentWeek = schoolWeekOf(todayInAlgiers(), p.startDate, cal.schoolDays, cal.holidays);
  const status = progressStatus(p.rows, currentWeek);

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

  return (
    <>
      <div className="space-y-4 pb-4 print:hidden">
        {official && state !== "saved" && <p className="rounded-2xl bg-brand-50 p-3 text-sm text-brand-900">{t("officialHint")}</p>}
        <EditTip id="progression-edit" title={t("tipTitle")}>{t("tipBody")}</EditTip>
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
              <Link href={`/app/planning/${p.classId}/${p.subjectId}/print?mode=annual`} className={buttonClass("secondary")}>
                <Printer aria-hidden className="size-4" />
                {t("print")} · {t("annual")}
              </Link>
              <Link href={`/app/planning/${p.classId}/${p.subjectId}/print?mode=monthly`} className={buttonClass("secondary")}>
                <Printer aria-hidden className="size-4" />
                {t("monthly")}
              </Link>
            </>
          )}
          {canReset && (
            <button type="button" onClick={() => void reset()} disabled={state === "saving"} className={buttonClass("ghost")}>
              <RotateCcw aria-hidden className="size-4" />
              {t("reset")}
            </button>
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
              dir={dir}
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
            <ol dir={docLang ? "ltr" : undefined} lang={docLang ?? undefined} className="space-y-2">
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
                          aria-label={D?.weekCol ?? t("weekCol")}
                          onChange={(e) => setRow(i, { w: Number(e.target.value) })}
                          className="h-11 w-full min-w-0 rounded-xl border border-line bg-surface text-center outline-none focus:border-brand-600"
                        />
                        <input
                          value={r.unit}
                          maxLength={ROW_MAX.unit}
                          dir={dir}
                          placeholder={D?.unitCol ?? t("unit")}
                          aria-label={D?.unitCol ?? t("unit")}
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
                          dir={dir}
                          placeholder={D?.content ?? t("content")}
                          aria-label={D?.content ?? t("content")}
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
                          {current ? (D?.thisWeek ?? t("thisWeek")) : weekLabel(r.w)}
                        </span>
                        <span className={cn("min-w-0 flex-1", r.done && "text-muted")}>
                          {(r.unit || (r.k && r.k !== "all")) && (
                            <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                              {r.unit && <span dir={dir}>{r.unit}</span>}
                              {r.k && r.k !== "all" && <span className="rounded-full bg-emerald-50 px-1.5 font-semibold text-emerald-800">{tm(r.k)}</span>}
                            </span>
                          )}
                          <span dir={dir} className={cn("block", r.done && "line-through")}>{r.content}</span>
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

    </>
  );
}
