"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { LoaderCircle, Printer } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, SelectField } from "@/components/ui/field";
import { useClasses, useTaxonomy, useTeacher, useUid } from "@/features/classes/hooks";
import type { ClassDoc } from "@/features/classes/repo";
import type { Student } from "@/features/students/roster";
import { todayInAlgiers } from "@/features/attendance/logic";
import { generalAverage, formatMark, scaleFor, termOf, TERMS, type Term } from "@/features/logbook/grades-logic";
import { getGrades } from "@/features/logbook/repo";
import { formatLongDate } from "@/i18n/dates";
import { parseAcademicYearId } from "@/shared/academic-year";
import { gradeLabel } from "@/shared/dz/education";
import { levelById, type StageTaxonomy } from "@/shared/taxonomy/taxonomy";
import { cn } from "@/lib/utils/cn";
import { absenceGrid, pupilWord } from "./logic";
import { listMonthSessions } from "./repo";
import type { TemplateId } from "./templates";

const LANDSCAPE: Record<TemplateId, boolean> = { certificates: true, absences: true, convocation: false, classSign: true, nameCards: false };

const fullName = (s: Student) => `${s.last} ${s.first}`;
const dmy = (iso: string) => iso.split("-").reverse().join("/");

export function DocumentBuilder({ template }: { template: TemplateId }) {
  const t = useTranslations("documents");
  const teacher = useTeacher();
  const classes = useClasses();
  const tax = useTaxonomy(teacher.data?.profile.stage);
  const [classId, setClassId] = useState<string | null>(null);

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
        <p className="text-muted">{t("noClasses")}</p>
        <Link href="/app/classes/new" className={buttonClass("primary")}>{t("class")}</Link>
      </Card>
    );
  }
  const cls = active.find((c) => c.id === classId) ?? active[0]!;
  const props = { cls, taxonomy: tax.data };

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <SelectField label={t("class")} value={cls.id} onChange={(e) => setClassId(e.target.value)}>
          {active.map((c) => (
            <option key={c.id} value={c.id}>{c.displayName}</option>
          ))}
        </SelectField>
      </div>
      {template === "certificates" && <Certificates key={cls.id} {...props} />}
      {template === "absences" && <Absences key={cls.id} {...props} />}
      {template === "convocation" && <Convocations key={cls.id} {...props} />}
      {template === "classSign" && <ClassSign {...props} />}
      {template === "nameCards" && <NameCards {...props} />}
    </div>
  );
}

// ── مشترك ──

function useIdentity() {
  const locale = useLocale() as "ar" | "fr";
  const { profile, school } = useTeacher().data!;
  return {
    locale,
    teacher: `${profile.lastName} ${profile.firstName}`,
    grade: gradeLabel(profile.stage, profile.gradeId, profile.gradeCustom, locale),
    school: school?.name ?? "",
    commune: school?.commune ?? "",
    directorate: school?.directorate ?? profile.directorate,
    year: parseAcademicYearId(profile.activeYearId)?.label ?? "",
    stage: profile.stage,
  };
}

function Preview({ template, pages, children }: { template: TemplateId; pages: number; children: React.ReactNode }) {
  const t = useTranslations("documents");
  const landscape = LANDSCAPE[template];
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <button type="button" onClick={() => window.print()} disabled={!pages} className={buttonClass("primary")}>
          <Printer aria-hidden className="size-4" />
          {t("print")}
        </button>
        <span className="text-sm text-muted">{t("pages", { n: pages })}</span>
      </div>
      <style>{`@page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 0; }`}</style>
      <div className="-mx-4 overflow-x-auto bg-canvas px-4 py-4 print:m-0 print:overflow-visible print:bg-transparent print:p-0">
        <div className={cn("doc-preview", landscape && "doc-landscape")}>{children}</div>
      </div>
    </>
  );
}

function StudentPicker({ roster, picked, setPicked, extra }: { roster: Student[]; picked: Set<string>; setPicked: (s: Set<string>) => void; extra?: (s: Student) => React.ReactNode }) {
  const t = useTranslations("documents");
  return (
    <details className="rounded-xl ring-1 ring-line" open={roster.length <= 12}>
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 px-3 text-sm font-medium">
        {t("pickStudents")}
        <span className="text-muted">{t("selected", { n: picked.size })}</span>
      </summary>
      <div className="flex gap-2 px-3 pb-2">
        <button type="button" onClick={() => setPicked(new Set(roster.map((s) => s.id)))} className="text-sm font-medium text-brand-700">{t("all")}</button>
        <button type="button" onClick={() => setPicked(new Set())} className="text-sm font-medium text-brand-700">{t("none")}</button>
      </div>
      <ul className="max-h-72 overflow-y-auto border-t border-line">
        {roster.map((s) => (
          <li key={s.id}>
            <label className="flex min-h-11 items-center gap-3 px-3">
              <input
                type="checkbox"
                checked={picked.has(s.id)}
                onChange={() => {
                  const next = new Set(picked);
                  if (next.has(s.id)) next.delete(s.id);
                  else next.add(s.id);
                  setPicked(next);
                }}
                className="size-5 accent-brand-700"
              />
              <span className="flex-1">{fullName(s)}</span>
              {extra?.(s)}
            </label>
          </li>
        ))}
      </ul>
    </details>
  );
}

function OfficialHeader({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("documents");
  const id = useIdentity();
  return (
    <div className={cn("text-center", compact ? "text-[10pt]" : "text-[11pt]")}>
      <p className="font-bold">{t("republic")}</p>
      <p className="font-bold">{t("ministry")}</p>
      <div className="mt-1 flex justify-between text-start">
        <span>{id.directorate}</span>
        <span>{id.school}</span>
      </div>
    </div>
  );
}

// ── الشهادات ──

type CertKind = "encouragement" | "congratulations" | "honor";

function Certificates({ cls, taxonomy }: { cls: ClassDoc; taxonomy: StageTaxonomy }) {
  const t = useTranslations("documents");
  const id = useIdentity();
  const uid = useUid();
  const [kind, setKind] = useState<CertKind>("encouragement");
  const [term, setTerm] = useState<Term>(() => termOf(todayInAlgiers()));
  const [withAvg, setWithAvg] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(cls.roster.map((s) => s.id)));
  const [min, setMin] = useState("");
  const scale = scaleFor(id.stage);
  const grades = useQuery({ queryKey: ["grades", uid ?? "", cls.id, term], queryFn: () => getGrades(uid!, cls.id, term, scale), enabled: !!uid });
  const avg = (s: Student) => (grades.data ? generalAverage(grades.data[s.id], cls.subjectIds, id.stage) : null);
  const chosen = cls.roster.filter((s) => picked.has(s.id));
  const date = formatLongDate(new Date(), id.locale);

  function autoPick(v: string) {
    setMin(v);
    const n = Number(v.replace(",", "."));
    if (!v.trim() || !Number.isFinite(n)) return;
    setPicked(new Set(cls.roster.filter((s) => (avg(s) ?? -1) >= n).map((s) => s.id)));
  }

  return (
    <>
      <Card className="space-y-3 print:hidden">
        <div className="grid grid-cols-2 gap-3">
          <SelectField label={t("kind")} value={kind} onChange={(e) => setKind(e.target.value as CertKind)}>
            {(["encouragement", "congratulations", "honor"] as const).map((k) => (
              <option key={k} value={k}>{t(`kinds.${k}`)}</option>
            ))}
          </SelectField>
          <SelectField label={t("term")} value={term} onChange={(e) => setTerm(Number(e.target.value) as Term)}>
            {TERMS.map((n) => (
              <option key={n} value={n}>{t(`terms.${n}`)}</option>
            ))}
          </SelectField>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={withAvg} onChange={(e) => setWithAvg(e.target.checked)} className="size-5 accent-brand-700" />
            {t("withAverage")}
          </label>
          <Field label={t("minAverage")} inputMode="decimal" dir="ltr" value={min} onChange={(e) => autoPick(e.target.value)} className="w-40" />
        </div>
        {cls.roster.length ? (
          <StudentPicker
            roster={cls.roster}
            picked={picked}
            setPicked={setPicked}
            extra={(s) => <span className="text-sm tabular-nums text-muted">{formatMark(avg(s))}</span>}
          />
        ) : (
          <p className="text-muted">{t("noStudents")}</p>
        )}
      </Card>
      <Preview template="certificates" pages={chosen.length}>
        {chosen.map((s) => {
          const a = avg(s);
          return (
            <div key={s.id} className="doc-sheet" style={{ padding: "9mm" }}>
              <div className="flex h-full flex-col border-[5px] border-double border-[#0b4f4a] p-[3mm]">
                <div className="flex h-full flex-col justify-between border border-[#0b4f4a] px-[12mm] py-[7mm] text-center">
                  <OfficialHeader />
                  <div className="space-y-5">
                    <p className="font-display text-[34pt] font-bold text-[#0b4f4a]">{t(`kinds.${kind}`)}</p>
                    <p className="text-[15pt]">{t("awardedTo")} {pupilWord(s.gender, id.locale)}:</p>
                    <p className="font-display text-[28pt] font-bold"><bdi>{fullName(s)}</bdi></p>
                    <p className="text-[14pt]">
                      {t("ofClass")} <bdi dir="ltr" className="font-bold">{cls.displayName}</bdi> ({levelById(taxonomy, cls.level)?.label[id.locale]})
                      {" — "}
                      {t(`certBody.${kind}`, { term: t(`terms.${term}`) })}
                      {withAvg && a !== null && (
                        <>
                          {" — "}
                          {t("average")}: <b dir="ltr">{formatMark(a)}/{scale}</b>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-end justify-between text-[12pt]">
                    <div className="text-start">
                      <p>{t("teacherSign")}</p>
                      <p className="font-bold">{id.teacher}</p>
                    </div>
                    <p>{t("doneAt")} {id.commune || "........"} {t("on")} {date}</p>
                    <div className="text-end">
                      <p>{t("directorSign")}</p>
                      <p>&nbsp;</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </Preview>
    </>
  );
}

// ── الغيابات الشهرية ──

function Absences({ cls }: { cls: ClassDoc; taxonomy: StageTaxonomy }) {
  const t = useTranslations("documents");
  const id = useIdentity();
  const uid = useUid();
  const [month, setMonth] = useState(() => todayInAlgiers().slice(0, 7));
  const sessions = useQuery({ queryKey: ["monthSessions", uid ?? "", cls.id, month], queryFn: () => listMonthSessions(uid!, cls.id, month), enabled: !!uid && /^\d{4}-\d{2}$/.test(month) });
  const grid = sessions.data ? absenceGrid(cls.roster.map((s) => s.id), sessions.data, id.locale) : null;
  const monthLabel = new Intl.DateTimeFormat(id.locale === "ar" ? "ar-DZ" : "fr-DZ", { month: "long", year: "numeric", numberingSystem: "latn" }).format(new Date(`${month}-15T12:00:00`));

  return (
    <>
      <Card className="space-y-2 print:hidden">
        <Field label={t("month")} type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="max-w-56" />
        {grid && <p className="text-sm text-muted">{grid.sessions ? t("sessionsCount", { n: grid.sessions }) : t("noSessions")}</p>}
      </Card>
      {!grid ? (
        <div role="status" className="grid place-items-center py-10">
          <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
        </div>
      ) : (
        <Preview template="absences" pages={1}>
          <div className="doc-sheet text-[9pt]" style={{ padding: "10mm" }}>
            <OfficialHeader compact />
            <div className="my-2 flex justify-between">
              <span>{t("signTeacher")}: <b>{id.teacher}</b></span>
              <span className="text-[13pt] font-bold">{t("absTitle", { month: monthLabel })}</span>
              <span>{t("ofClass")}: <b dir="ltr">{cls.displayName}</b></span>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-[8mm] border border-black px-1">{t("num")}</th>
                  <th className="w-[55mm] border border-black px-1 text-start">{t("student")}</th>
                  {grid.days.map((d) => (
                    <th key={d} className="w-[5.5mm] border border-black text-[7.5pt]">{Number(d.slice(8))}</th>
                  ))}
                  <th className="w-[18mm] border border-black px-1">{t("absences")}</th>
                  <th className="w-[18mm] border border-black px-1">{t("justified")}</th>
                  <th className="w-[18mm] border border-black px-1">{t("late")}</th>
                </tr>
              </thead>
              <tbody>
                {cls.roster.map((s, i) => {
                  const r = grid.rows[i]!;
                  return (
                    <tr key={s.id} className="h-[5.2mm]">
                      <td className="border border-black text-center">{i + 1}</td>
                      <td className="border border-black px-1 whitespace-nowrap"><bdi>{fullName(s)}</bdi></td>
                      {grid.days.map((d) => (
                        <td key={d} className="border border-black text-center text-[7.5pt] font-bold">{r.cells[d] ?? ""}</td>
                      ))}
                      <td className="border border-black text-center font-bold">{r.a + r.e || ""}</td>
                      <td className="border border-black text-center">{r.e || ""}</td>
                      <td className="border border-black text-center">{r.l || ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-[8pt]">{t("legend")}</p>
          </div>
        </Preview>
      )}
    </>
  );
}

// ── الاستدعاء ──

function Convocations({ cls }: { cls: ClassDoc; taxonomy: StageTaxonomy }) {
  const t = useTranslations("documents");
  const id = useIdentity();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [date, setDate] = useState(todayInAlgiers());
  const [time, setTime] = useState("10:00");
  const [reason, setReason] = useState(t("reasonDefault"));
  const chosen = cls.roster.filter((s) => picked.has(s.id));
  const pages = Array.from({ length: Math.ceil(chosen.length / 2) }, (_, i) => chosen.slice(i * 2, i * 2 + 2));

  return (
    <>
      <Card className="space-y-3 print:hidden">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("date")} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Field label={t("time")} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <label className="block space-y-1.5">
          <span className="block text-sm font-medium">{t("reason")}</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={300}
            dir="auto"
            className="block w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-brand-600"
          />
        </label>
        <StudentPicker roster={cls.roster} picked={picked} setPicked={setPicked} />
      </Card>
      <Preview template="convocation" pages={pages.length}>
        {pages.map((pair, pi) => (
          <div key={pi} className="doc-sheet flex flex-col" style={{ padding: 0 }}>
            {pair.map((s, i) => (
              <div key={s.id} className={cn("flex h-1/2 flex-col justify-between px-[14mm] py-[10mm] text-[12pt]", i === 0 && "border-b-2 border-dashed border-black/40")}>
                <OfficialHeader compact />
                <div className="space-y-4">
                  <p className="text-center font-display text-[22pt] font-bold">{t("convTitle")}</p>
                  <p>
                    {t("convTo")} {pupilWord(s.gender, id.locale)}: <b><bdi>{fullName(s)}</bdi></b> — {t("ofClass")} <b dir="ltr">{cls.displayName}</b>
                  </p>
                  <p>{t("convBody", { date: `${formatLongDate(new Date(`${date}T12:00:00`), id.locale)}`, time })}</p>
                  <p dir="auto" className="whitespace-pre-line rounded border border-black/40 px-3 py-2">{reason}</p>
                </div>
                <div className="flex justify-between">
                  <span>{t("doneAt")} {id.commune || "........"} {t("on")} {dmy(todayInAlgiers())}</span>
                  <span className="text-end">
                    {t("signTeacher")}
                    <br />
                    <b>{id.teacher}</b>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </Preview>
    </>
  );
}

// ── لافتة القسم ──

function ClassSign({ cls, taxonomy }: { cls: ClassDoc; taxonomy: StageTaxonomy }) {
  const t = useTranslations("documents");
  const id = useIdentity();
  return (
    <Preview template="classSign" pages={1}>
      <div className="doc-sheet" style={{ padding: "10mm" }}>
        <div className="flex h-full flex-col items-center justify-between rounded-[8mm] border-[3mm] border-[#0b4f4a] px-[10mm] py-[10mm] text-center">
          <p className="text-[18pt] font-bold">{id.school}</p>
          <div>
            <p className="font-display text-[40pt] font-bold text-[#0b4f4a]">{levelById(taxonomy, cls.level)?.label[id.locale]}</p>
            <p className="font-display text-[110pt] font-black leading-none" dir="ltr">{cls.displayName}</p>
          </div>
          <div className="text-[16pt]">
            <p>{t("signTeacher")}: <b>{id.teacher}</b></p>
            <p className="text-[12pt]">{t("signYear")}: <bdi dir="ltr">{id.year}</bdi></p>
          </div>
        </div>
      </div>
    </Preview>
  );
}

// ── بطاقات الطاولة ──

function NameCards({ cls }: { cls: ClassDoc; taxonomy: StageTaxonomy }) {
  const t = useTranslations("documents");
  const pages = Array.from({ length: Math.ceil(cls.roster.length / 3) }, (_, i) => cls.roster.slice(i * 3, i * 3 + 3));
  if (!cls.roster.length) return <Card className="py-10 text-center text-muted">{t("noStudents")}</Card>;
  return (
    <Preview template="nameCards" pages={pages.length}>
      {pages.map((trio, pi) => (
        <div key={pi} className="doc-sheet" style={{ padding: 0 }}>
          {trio.map((s) => (
            <div key={s.id} className="flex h-[99mm] flex-col border-b border-dashed border-black/40">
              {/* الوجه العلوي مقلوب: يُقرأ من الجهة الأخرى بعد طيّ البطاقة */}
              <div className="flex h-1/2 rotate-180 items-center justify-center border-b border-dotted border-black/30">
                <p className="font-display text-[30pt] font-bold"><bdi>{fullName(s)}</bdi></p>
              </div>
              <div className="flex h-1/2 flex-col items-center justify-center">
                <p className="font-display text-[30pt] font-bold"><bdi>{fullName(s)}</bdi></p>
                <p className="text-[11pt]" dir="ltr">{cls.displayName}</p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </Preview>
  );
}
