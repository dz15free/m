"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, LoaderCircle, Printer } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { PrintHeader } from "@/features/logbook/print-header";
import { DOC, docLangOfSubject, docMonth } from "@/i18n/doc-lang";
import { monthName } from "@/i18n/dates";
import { cn } from "@/lib/utils/cn";
import { weekStart, type ProgressionRow } from "./logic";
import { toneOf } from "./monthly-sheet";
import { useProgressionModel } from "./progression-editor";

type Mode = "annual" | "monthly";

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/* صفحة طباعة التوزيع السنوي أو الشهري: الوثيقة نفسها على الشاشة (معاينة A4) ثم نافذة الطباعة.
   صفحة مستقلة لأن طباعة جزء مخفي من صفحة كبيرة كانت تتأخر أو لا تظهر على iPhone؛ هنا تُرى الوثيقة دائمًا،
   ويمكن طباعتها من زر «طباعة» أو من قائمة المشاركة في Safari. الألوان تُطبع كما هي. */
export function ProgressionPrint({ classId, subjectId, mode }: { classId: string; subjectId: string; mode: Mode }) {
  const t = useTranslations("planning");
  const tm = useTranslations("planning.monthlyPlan");
  const locale = useLocale() as "ar" | "fr";
  const m = useProgressionModel(classId, subjectId);
  const printed = useRef(false);

  const ready = !!m;
  useEffect(() => {
    if (!ready || printed.current) return;
    // بعد رسم الوثيقة؛ إن منع المتصفح الطباعة التلقائية يبقى زر «طباعة»
    const id = window.setTimeout(() => {
      printed.current = true;
      window.print();
    }, 700);
    return () => window.clearTimeout(id);
  }, [ready]);

  if (!m) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }

  const lang = docLangOfSubject(subjectId);
  const D = lang ? DOC[lang] : null;
  const p = m.initial;
  const cal = m.calendar;
  const tone = toneOf(subjectId);
  const subject = D?.subject ?? m.subjectLabel?.[locale] ?? subjectId;
  const title = D ? `${mode === "annual" ? D.annualTitle : D.monthlyTitle} — ${subject}` : t(mode === "annual" ? "annualTitle" : "monthlyTitle", { subject });
  const weekDate = (w: number) => weekStart(w, p.startDate, cal.schoolDays, cal.holidays);
  const examTerm = (w: number) => {
    const from = weekDate(w);
    const to = addDays(from, 6);
    return (cal.exams ?? []).find((e) => e.days.some((d) => d >= from && d <= to))?.term;
  };
  const monthTitle = (month: string) => (lang ? docMonth(month, lang) : `${monthName(Number(month.slice(5, 7)), locale)} ${month.slice(0, 4)}`);

  const months = new Map<string, ProgressionRow[]>();
  for (const r of p.rows) {
    const key = weekDate(r.w).slice(0, 7);
    months.set(key, [...(months.get(key) ?? []), r]);
  }
  const labels = {
    week: D?.weekCol ?? t("weekCol"),
    dates: D ? "Dates" : t("datesCol"),
    content: D?.content ?? t("content"),
    done: D?.done ?? t("done"),
    exams: (term: number) => D?.exams(term) ?? tm("exams", { term }),
    k: (k: string) => tm(k as "oral"),
  };
  const back = `/app/planning/${classId}/${subjectId}`;

  return (
    <div className="space-y-4 [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
      <style>{"@page { size: A4 portrait; margin: 10mm; }"}</style>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Link href={back} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-700">
          <ArrowRight aria-hidden className="size-4 ltr:rotate-180" />
          {t("back")}
        </Link>
        <span className="flex-1" />
        <nav className="flex gap-1 rounded-full bg-surface p-1 shadow-card">
          {(["annual", "monthly"] as const).map((k) => (
            <Link
              key={k}
              href={`${back}/print?mode=${k}`}
              replace
              aria-current={k === mode ? "page" : undefined}
              className={cn("rounded-full px-4 py-2 text-sm font-semibold", k === mode ? "bg-brand-700 text-white" : "text-ink hover:bg-brand-50")}
            >
              {t(k)}
            </Link>
          ))}
        </nav>
        <button type="button" onClick={() => window.print()} className={buttonClass("primary")}>
          <Printer aria-hidden className="size-4" />
          {t("print")}
        </button>
      </div>

      {/* الورقة: معاينة A4 على الشاشة، وهي نفسها ما يُطبع */}
      <article
        dir={lang ? "ltr" : undefined}
        lang={lang ?? undefined}
        className="mx-auto w-full max-w-[210mm] rounded-2xl bg-white p-[8mm] text-[10pt] text-ink shadow-card ring-1 ring-line print:max-w-none print:rounded-none print:p-0 print:shadow-none print:ring-0"
      >
        <PrintHeader title={title} subtitle={lang ? m.className : `${m.levelLocal?.[locale] ?? ""} — ${m.className}`} lang={lang} level={m.levelLabel} official />

        {p.rows.length === 0 ? (
          <p className="py-10 text-center text-muted">{t("empty")}</p>
        ) : mode === "annual" ? (
          <RowsTable rows={p.rows} weekDate={weekDate} examTerm={examTerm} labels={labels} toneHead={tone.head} toneTint={tone.tint} />
        ) : (
          [...months].map(([month, rows]) => (
            <section key={month} className="mb-4 break-inside-avoid">
              <h2 className={cn("mb-1 rounded-md px-3 py-1.5 text-[11pt] font-bold", tone.head)}>{monthTitle(month)}</h2>
              <RowsTable rows={rows} weekDate={weekDate} examTerm={examTerm} labels={labels} toneHead={tone.head} toneTint={tone.tint} />
            </section>
          ))
        )}

        <div className="mt-8 grid break-inside-avoid grid-cols-3 text-center font-semibold">
          {D ? (
            <>
              <p>{D.signInspector}</p>
              <p>{D.signDirector}</p>
              <p>{D.signTeacher}</p>
            </>
          ) : (
            <>
              <p>{tm("signTeacher")}</p>
              <p>{tm("signDirector")}</p>
              <p>{tm("signInspector")}</p>
            </>
          )}
        </div>
      </article>
    </div>
  );
}

type Labels = { week: string; dates: string; content: string; done: string; exams: (term: number) => string; k: (k: string) => string };

/** جدول الأسابيع: سطر لكل أسبوع بحصصه، وشريط ملوّن عند بداية كل مقطع/وحدة، وأسابيع الاختبارات معلَّمة.
    (بلا خانات مدمجة عموديًا: تنكسر بين الصفحات بلا فراغات) */
function RowsTable({ rows, weekDate, examTerm, labels: L, toneHead, toneTint }: {
  rows: ProgressionRow[];
  weekDate: (w: number) => string;
  examTerm: (w: number) => number | undefined;
  labels: Labels;
  toneHead: string;
  toneTint: string;
}) {
  type Line = { kind: "unit"; unit: string } | { kind: "week"; w: number; items: ProgressionRow[]; odd: boolean };
  const lines: Line[] = [];
  let unit: string | null = null;
  let weeks = 0;
  for (const r of rows) {
    if (r.unit !== unit) {
      unit = r.unit;
      if (r.unit) lines.push({ kind: "unit", unit: r.unit });
    }
    const last = lines.at(-1);
    if (last?.kind === "week" && last.w === r.w) last.items.push(r);
    else lines.push({ kind: "week", w: r.w, items: [r], odd: weeks++ % 2 === 1 });
  }
  const cell = "border border-slate-400 px-2 py-1 align-top";
  return (
    <table className="w-full border-collapse text-[9.5pt]">
      <thead className="table-header-group">
        <tr className={toneHead}>
          <th className={cn(cell, "w-14 text-center")}>{L.week}</th>
          <th className={cn(cell, "w-24 text-center")}>{L.dates}</th>
          <th className={cell}>{L.content}</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line, i) => {
          if (line.kind === "unit") {
            return (
              <tr key={i} className="break-inside-avoid break-after-avoid">
                <td colSpan={3} className={cn(cell, "py-1.5 font-bold", toneHead)}>
                  <bdi>{line.unit}</bdi>
                </td>
              </tr>
            );
          }
          const from = weekDate(line.w);
          const term = examTerm(line.w);
          return (
            <tr key={i} className={cn("break-inside-avoid", line.odd ? toneTint : "bg-white")}>
              <td className={cn(cell, "text-center text-[11pt] font-bold")}>{line.w}</td>
              <td className={cn(cell, "whitespace-nowrap text-center text-[8.5pt]")}>
                <bdi dir="ltr">{dm(from)} – {dm(addDays(from, 4))}</bdi>
                {term && <span className="mt-1 block rounded bg-rose-100 px-1 text-[8pt] font-semibold whitespace-normal text-rose-900">{L.exams(term)}</span>}
              </td>
              <td className={cell}>
                <ul className="space-y-0.5">
                  {line.items.map((r, j) => (
                    <li key={j} className="flex items-start gap-1.5">
                      <span aria-label={r.done ? L.done : undefined} className={cn("mt-px w-3 shrink-0 text-center font-bold", r.done ? "text-emerald-700" : "text-slate-300")}>
                        {r.done ? "✓" : "○"}
                      </span>
                      <span className="min-w-0">
                        {r.k && r.k !== "all" && <span className="me-1 rounded bg-emerald-100 px-1 text-[8pt] font-semibold text-emerald-900">{L.k(r.k)}</span>}
                        <bdi>{r.content}</bdi>
                      </span>
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
