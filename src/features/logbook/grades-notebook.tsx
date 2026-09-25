"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Check, ClipboardList, LoaderCircle, Lock, Printer } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/field";
import { useClasses, useTaxonomy, useTeacher, useUid } from "@/features/classes/hooks";
import type { ClassDoc } from "@/features/classes/repo";
import { todayInAlgiers } from "@/features/attendance/logic";
import type { Stage } from "@/shared/dz/education";
import { parseAcademicYearId } from "@/shared/academic-year";
import { levelById, subjectById, type StageTaxonomy } from "@/shared/taxonomy/taxonomy";
import { cn } from "@/lib/utils/cn";
import {
  annualAverage,
  COMPONENTS,
  columnsOf,
  formatMark,
  generalAverage,
  parseMark,
  ranks,
  scaleFor,
  subjectAverage,
  termOf,
  TERMS,
  type MarksSheet,
  type Term,
} from "./grades-logic";
import { getGrades, setMark } from "./repo";

type Tab = "entry" | "results";
type PrintMode = "sheet" | "results" | null;

export function GradesNotebook() {
  const t = useTranslations("logbook.grades");
  const teacher = useTeacher();
  const classes = useClasses();
  const tax = useTaxonomy(teacher.data?.profile.stage);
  const [classId, setClassId] = useState<string | null>(null);
  const [term, setTerm] = useState<Term>(() => termOf(todayInAlgiers()));

  if (!teacher.data || !classes.data || !tax.data) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }

  const active = classes.data.filter((c) => !c.archived);
  if (!active.length) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <ClipboardList aria-hidden className="size-8 text-brand-700" />
        <p className="text-muted">{t("noClasses")}</p>
        <Link href="/app/classes/new" className={buttonClass("primary")}>{t("addStudents")}</Link>
      </Card>
    );
  }
  const cls = active.find((c) => c.id === classId) ?? active[0]!;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 print:hidden">
        <SelectField label={t("class")} value={cls.id} onChange={(e) => setClassId(e.target.value)}>
          {active.map((c) => (
            <option key={c.id} value={c.id}>{c.displayName}</option>
          ))}
        </SelectField>
        <SelectField label={t("term")} value={term} onChange={(e) => setTerm(Number(e.target.value) as Term)}>
          {TERMS.map((n) => (
            <option key={n} value={n}>{t(`terms.${n}`)}</option>
          ))}
        </SelectField>
      </div>
      <ClassGrades key={`${cls.id}-${term}`} cls={cls} term={term} stage={teacher.data.profile.stage} taxonomy={tax.data} />
    </div>
  );
}

function ClassGrades({ cls, term, stage, taxonomy }: { cls: ClassDoc; term: Term; stage: Stage; taxonomy: StageTaxonomy }) {
  const t = useTranslations("logbook.grades");
  const locale = useLocale() as "ar" | "fr";
  const uid = useUid();
  const scale = scaleFor(stage);
  // الفصول الثلاثة معًا: المعدل السنوي يحتاجها، وهي مستندات صغيرة
  const sheets = useQueries({
    queries: TERMS.map((n) => ({
      queryKey: ["grades", uid ?? "", cls.id, n],
      queryFn: () => getGrades(uid!, cls.id, n, scale),
      enabled: !!uid,
    })),
  });
  const [tab, setTab] = useState<Tab>("entry");
  const [printMode, setPrintMode] = useState<PrintMode>(null);

  const current = sheets[term - 1]?.data;
  if (!current) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  if (!cls.roster.length) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-muted">{t("noStudents")}</p>
        <Link href={`/app/classes/${cls.id}/students`} className={buttonClass("primary")}>{t("addStudents")}</Link>
      </Card>
    );
  }

  const subjects = cls.subjectIds.filter((s) => subjectById(taxonomy, s));
  const label = (s: string) => subjectById(taxonomy, s)?.label[locale] ?? s;
  const allTerms = sheets.map((q) => q.data ?? {});

  function print(mode: Exclude<PrintMode, null>) {
    flushSync(() => setPrintMode(mode));
    window.print();
  }

  return (
    <>
      <div className="space-y-4 print:hidden">
        <p className="flex items-center gap-2 text-xs text-muted">
          <Lock aria-hidden className="size-3.5" />
          {t("privacy")}
        </p>
        <div role="tablist" className="flex gap-1 rounded-full bg-canvas p-1 ring-1 ring-line">
          {(["entry", "results"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn("min-h-10 flex-1 rounded-full text-sm font-medium", tab === k ? "bg-surface shadow-card" : "text-muted")}
            >
              {t(`tabs.${k}`)}
            </button>
          ))}
        </div>

        {tab === "entry" ? (
          <Entry cls={cls} term={term} stage={stage} subjects={subjects} label={label} sheet={current} scale={scale} />
        ) : (
          <Results cls={cls} term={term} stage={stage} subjects={subjects} label={label} sheets={allTerms} />
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => print("sheet")} className={buttonClass("secondary")}>
            <Printer aria-hidden className="size-4" />
            {t("printSheet")}
          </button>
          <button type="button" onClick={() => print("results")} className={buttonClass("secondary")}>
            <Printer aria-hidden className="size-4" />
            {t("printResults")}
          </button>
        </div>
      </div>

      <div className="hidden print:block">
        {printMode === "sheet" && <PrintSheet cls={cls} term={term} stage={stage} subjects={subjects} label={label} sheet={current} taxonomy={taxonomy} />}
        {printMode === "results" && (
          <PrintResults cls={cls} term={term} stage={stage} subjects={subjects} label={label} sheets={allTerms} taxonomy={taxonomy} />
        )}
      </div>
    </>
  );
}

// ── الإدخال: عمود واحد في كل مرة، تلميذ بعد تلميذ (أسرع على الهاتف) ──

function Entry({
  cls,
  term,
  stage,
  subjects,
  label,
  sheet,
  scale,
}: {
  cls: ClassDoc;
  term: Term;
  stage: Stage;
  subjects: string[];
  label: (s: string) => string;
  sheet: MarksSheet;
  scale: number;
}) {
  const t = useTranslations("logbook.grades");
  const uid = useUid();
  const queryClient = useQueryClient();
  const columns = subjects.flatMap((s) => columnsOf(s, stage).map((c) => ({ subject: s, column: c })));
  const [column, setColumn] = useState(columns[0]?.column ?? "");
  const [status, setStatus] = useState<Record<string, "saving" | "saved" | "error" | "invalid">>({});
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const colLabel = (c: string) => (c.includes("_") ? t(`components.${c}` as "components.ar_oral") : label(c));
  const done = cls.roster.filter((s) => typeof sheet[s.id]?.[column] === "number").length;
  const chip = (c: string, text: string) => (
    <button
      key={c}
      type="button"
      onClick={() => {
        setColumn(c);
        setStatus({});
      }}
      aria-pressed={column === c}
      className={cn(
        "min-h-9 rounded-full px-3 text-sm font-medium ring-1",
        column === c ? "bg-brand-700 text-white ring-brand-700" : "bg-surface ring-line",
      )}
    >
      {text}
    </button>
  );

  async function commit(studentId: string, raw: string) {
    if (!uid) return;
    const prev = sheet[studentId]?.[column];
    const value = parseMark(raw, scale);
    if (value !== null && Number.isNaN(value)) {
      setStatus((s) => ({ ...s, [studentId]: "invalid" }));
      return;
    }
    if ((value ?? undefined) === prev) {
      setStatus((s) => ({ ...s, [studentId]: prev === undefined ? s[studentId]! : "saved" }));
      return;
    }
    setStatus((s) => ({ ...s, [studentId]: "saving" }));
    queryClient.setQueryData<MarksSheet>(["grades", uid, cls.id, term], (old) => {
      const next = { ...old, [studentId]: { ...old?.[studentId] } };
      if (value === null) delete next[studentId]![column];
      else next[studentId]![column] = value;
      return next;
    });
    try {
      await setMark(uid, cls.id, term, studentId, column, value);
      setStatus((s) => ({ ...s, [studentId]: "saved" }));
    } catch {
      setStatus((s) => ({ ...s, [studentId]: "error" }));
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {/* المواد ذات المركّبات: سطر لكل مادة؛ البقية معًا في سطر واحد */}
        {subjects
          .filter((s) => columnsOf(s, stage).length > 1)
          .map((s) => (
            <div key={s} className="flex flex-wrap items-center gap-1.5">
              <span className="me-1 text-xs font-semibold text-muted">{label(s)}</span>
              {columnsOf(s, stage).map((c) => chip(c, colLabel(c)))}
            </div>
          ))}
        <div className="flex flex-wrap items-center gap-1.5">
          {subjects.filter((s) => columnsOf(s, stage).length === 1).map((s) => chip(s, label(s)))}
        </div>
      </div>
      <Card className="p-0">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <p className="font-semibold">
            {colLabel(column)} <span className="text-sm font-normal text-muted">({t("outOf", { n: scale })})</span>
          </p>
          <p className="text-sm text-muted tabular-nums">{t("filled", { done, total: cls.roster.length })}</p>
        </div>
        <p className="px-4 pt-2 text-xs text-muted">{t("entryHint")}</p>
        <ol className="divide-y divide-line">
          {cls.roster.map((s, i) => {
            const st = status[s.id];
            const v = sheet[s.id]?.[column];
            return (
              <li key={`${s.id}-${column}`} className="flex items-center gap-3 px-4 py-2">
                <span className="w-6 text-sm text-muted tabular-nums">{i + 1}</span>
                <label htmlFor={`m-${s.id}`} className="min-w-0 flex-1 truncate">{s.last} {s.first}</label>
                <span aria-live="polite" className="w-5 shrink-0">
                  {st === "saving" && <LoaderCircle aria-label={t("saving")} className="size-4 animate-spin text-muted" />}
                  {st === "saved" && <Check aria-label={t("saved")} className="size-4 text-green-700" />}
                </span>
                <input
                  id={`m-${s.id}`}
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  defaultValue={formatMark(v)}
                  inputMode="decimal"
                  autoComplete="off"
                  dir="ltr"
                  aria-invalid={st === "invalid" || undefined}
                  aria-describedby={st === "invalid" || st === "error" ? `e-${s.id}` : undefined}
                  onBlur={(e) => commit(s.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const next = inputs.current[i + 1];
                      if (next) next.focus();
                      else e.currentTarget.blur();
                    }
                  }}
                  className="h-11 w-20 rounded-xl border border-line bg-surface text-center text-lg font-semibold tabular-nums outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 aria-invalid:border-red-600"
                />
                {(st === "invalid" || st === "error") && (
                  <span id={`e-${s.id}`} role="alert" className="sr-only">
                    {st === "invalid" ? t("invalid", { n: scale }) : t("error")}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </Card>
      {Object.values(status).includes("invalid") && <p role="alert" className="text-sm text-red-700">{t("invalid", { n: scale })}</p>}
    </div>
  );
}

// ── النتائج ──

function useResults(cls: ClassDoc, term: Term, stage: Stage, subjects: string[], sheets: MarksSheet[]) {
  const sheet = sheets[term - 1] ?? {};
  const general = new Map(cls.roster.map((s) => [s.id, generalAverage(sheet[s.id], subjects, stage)] as const));
  const annual = new Map(
    cls.roster.map((s) => [s.id, annualAverage(sheets.map((sh) => generalAverage(sh[s.id], subjects, stage)))] as const),
  );
  return { sheet, general, rank: ranks(general), annual, showAnnual: term === 3 };
}

function Results({
  cls,
  term,
  stage,
  subjects,
  label,
  sheets,
}: {
  cls: ClassDoc;
  term: Term;
  stage: Stage;
  subjects: string[];
  label: (s: string) => string;
  sheets: MarksSheet[];
}) {
  const t = useTranslations("logbook.grades");
  const r = useResults(cls, term, stage, subjects, sheets);
  return (
    <div className="overflow-x-auto rounded-card bg-surface shadow-card">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="bg-canvas text-xs">
            <th className="sticky start-0 z-10 bg-canvas px-3 py-2 text-start">{t("student")}</th>
            {subjects.map((s) => (
              <th key={s} className="px-2 py-2 font-medium">{label(s)}</th>
            ))}
            <th className="px-2 py-2">{t("general")}</th>
            <th className="px-2 py-2">{t("rank")}</th>
            {r.showAnnual && <th className="px-2 py-2">{t("annual")}</th>}
          </tr>
        </thead>
        <tbody>
          {cls.roster.map((s) => (
            <tr key={s.id} className="border-t border-line">
              <th scope="row" className="sticky start-0 bg-surface px-3 py-2 text-start font-medium whitespace-nowrap">{s.last} {s.first}</th>
              {subjects.map((sub) => (
                <td key={sub} className="px-2 py-2 text-center tabular-nums">{formatMark(subjectAverage(r.sheet[s.id], sub, stage))}</td>
              ))}
              <td className="px-2 py-2 text-center font-bold tabular-nums">{formatMark(r.general.get(s.id))}</td>
              <td className="px-2 py-2 text-center tabular-nums">{r.rank.get(s.id) ?? ""}</td>
              {r.showAnnual && <td className="px-2 py-2 text-center font-semibold tabular-nums">{formatMark(r.annual.get(s.id))}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── الطباعة ──

function SheetHeader({ cls, title, taxonomy }: { cls: ClassDoc; title: string; taxonomy: StageTaxonomy }) {
  const t = useTranslations("logbook.grades");
  const locale = useLocale() as "ar" | "fr";
  const { profile, school } = useTeacher().data!;
  return (
    <header className="mb-3 text-[10.5pt]">
      <div className="flex justify-between gap-6">
        <div>
          <p><b>{t("school")}:</b> {school?.name}</p>
          <p><b>{t("teacher")}:</b> {profile.lastName} {profile.firstName}</p>
        </div>
        <div className="text-end">
          <p><b>{t("season")}:</b> <bdi dir="ltr">{parseAcademicYearId(profile.activeYearId)?.label}</bdi></p>
          <p>
            <b>{t("level")}:</b> {levelById(taxonomy, cls.level)?.label[locale]} — <bdi dir="ltr">{cls.displayName}</bdi>
          </p>
        </div>
      </div>
      <h1 className="mt-3 text-center text-[15pt] font-bold">{title}</h1>
    </header>
  );
}

const cellCls = "border border-ink px-1 py-1 text-center";

function PrintSheet({
  cls,
  term,
  stage,
  subjects,
  label,
  sheet,
  taxonomy,
}: {
  cls: ClassDoc;
  term: Term;
  stage: Stage;
  subjects: string[];
  label: (s: string) => string;
  sheet: MarksSheet;
  taxonomy: StageTaxonomy;
}) {
  const t = useTranslations("logbook.grades");
  // كشف الابتدائي: العربية والرياضيات بمركّباتهما؛ وإلا كل مواد القسم
  const withComponents = stage === "primary" ? subjects.filter((s) => COMPONENTS[s]) : [];
  const groups = withComponents.length ? withComponents : subjects;
  const title =
    withComponents.includes("ar") && withComponents.includes("math") ? t("sheetTitleArMath") : t("sheetTitle");
  return (
    <div className="text-[9.5pt]">
      <style>{"@page { size: A4 portrait; margin: 10mm; }"}</style>
      <SheetHeader cls={cls} taxonomy={taxonomy} title={`${title} — ${t(`terms.${term}`)}`} />
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-canvas">
            <th rowSpan={2} className={cn(cellCls, "w-8")}>{t("num")}</th>
            <th rowSpan={2} className={cn(cellCls, "w-[22%]")}>{t("student")}</th>
            {groups.map((s) => {
              const cols = columnsOf(s, stage);
              return (
                <th key={s} colSpan={cols.length > 1 ? cols.length + 1 : 1} rowSpan={cols.length > 1 ? 1 : 2} className={cellCls}>
                  {cols.length > 1 ? t("evaluation", { subject: label(s) }) : label(s)}
                </th>
              );
            })}
          </tr>
          <tr className="bg-canvas text-[8pt]">
            {groups.flatMap((s) => {
              const cols = columnsOf(s, stage);
              if (cols.length < 2) return [];
              return [
                ...cols.map((c) => <th key={c} className={cellCls}>{t(`components.${c}` as "components.ar_oral")}</th>),
                <th key={`${s}-avg`} className={cn(cellCls, "bg-amber-50 font-bold")}>{t("average")}</th>,
              ];
            })}
          </tr>
        </thead>
        <tbody>
          {cls.roster.map((st, i) => (
            <tr key={st.id} className="break-inside-avoid">
              <td className={cellCls}>{String(i + 1).padStart(2, "0")}</td>
              <td className="border border-ink px-1.5 py-1"><bdi>{st.last} {st.first}</bdi></td>
              {groups.flatMap((s) => {
                const cols = columnsOf(s, stage);
                const marks = sheet[st.id];
                if (cols.length < 2) return [<td key={s} className={cellCls}>{formatMark(subjectAverage(marks, s, stage))}</td>];
                return [
                  ...cols.map((c) => <td key={c} className={cellCls}>{formatMark(marks?.[c])}</td>),
                  <td key={`${s}-avg`} className={cn(cellCls, "bg-amber-50 font-bold")}>{formatMark(subjectAverage(marks, s, stage))}</td>,
                ];
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PrintResults({
  cls,
  term,
  stage,
  subjects,
  label,
  sheets,
  taxonomy,
}: {
  cls: ClassDoc;
  term: Term;
  stage: Stage;
  subjects: string[];
  label: (s: string) => string;
  sheets: MarksSheet[];
  taxonomy: StageTaxonomy;
}) {
  const t = useTranslations("logbook.grades");
  const r = useResults(cls, term, stage, subjects, sheets);
  const landscape = subjects.length > 8;
  return (
    <div className="text-[9pt]">
      <style>{`@page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 10mm; }`}</style>
      <SheetHeader cls={cls} taxonomy={taxonomy} title={t("resultsTitle", { term: t(`terms.${term}`) })} />
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-canvas text-[8pt]">
            <th className={cn(cellCls, "w-8")}>{t("num")}</th>
            <th className={cn(cellCls, "w-[20%]")}>{t("student")}</th>
            {subjects.map((s) => (
              <th key={s} className={cellCls}>{label(s)}</th>
            ))}
            <th className={cn(cellCls, "bg-amber-50")}>{t("general")}</th>
            <th className={cellCls}>{t("rank")}</th>
            {r.showAnnual && <th className={cn(cellCls, "bg-amber-50")}>{t("annual")}</th>}
            <th className={cn(cellCls, "w-[14%]")}>{t("remarks")}</th>
          </tr>
        </thead>
        <tbody>
          {cls.roster.map((st, i) => (
            <tr key={st.id} className="break-inside-avoid">
              <td className={cellCls}>{String(i + 1).padStart(2, "0")}</td>
              <td className="border border-ink px-1.5 py-1"><bdi>{st.last} {st.first}</bdi></td>
              {subjects.map((s) => (
                <td key={s} className={cellCls}>{formatMark(subjectAverage(r.sheet[st.id], s, stage))}</td>
              ))}
              <td className={cn(cellCls, "bg-amber-50 font-bold")}>{formatMark(r.general.get(st.id))}</td>
              <td className={cellCls}>{r.rank.get(st.id) ?? ""}</td>
              {r.showAnnual && <td className={cn(cellCls, "bg-amber-50 font-bold")}>{formatMark(r.annual.get(st.id))}</td>}
              <td className="border border-ink" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
