"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Check, IdCard, LoaderCircle, Printer } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, SelectField } from "@/components/ui/field";
import { useClasses, useTaxonomy, useTeacher, useUid } from "@/features/classes/hooks";
import type { ClassDoc } from "@/features/classes/repo";
import { useCalendar, useSchedule } from "@/features/schedule/repo";
import type { Calendar, Slot } from "@/features/schedule/logic";
import { gradeLabel } from "@/shared/dz/education";
import { parseAcademicYearId } from "@/shared/academic-year";
import { subjectById, type StageTaxonomy } from "@/shared/taxonomy/taxonomy";
import { cn } from "@/lib/utils/cn";
import { CARD_FIELDS, CARD_GROUPS, CARD_MAX, formatHours, subjectLoad, timetableGrid, type TeacherCard } from "./front-logic";
import { getCard, saveCard } from "./repo";

const NOTEBOOKS = ["daily", "prep", "grades", "training"] as const;
type Notebook = (typeof NOTEBOOKS)[number];
const SECTIONS = ["cover", "card", "students", "timetable", "load", "holidays", "surahs", "songs"] as const;
type Section = (typeof SECTIONS)[number];

// ما يسبق صفحات كل دفتر عادةً
const DEFAULTS: Record<Notebook, Section[]> = {
  daily: ["cover", "card", "students", "timetable", "load", "holidays"],
  prep: ["cover", "card"],
  grades: ["cover", "card", "students"],
  training: ["cover", "card"],
};

const dmy = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");
const dots = "..............................";

export function FrontPages() {
  const t = useTranslations("logbook.front");
  const uid = useUid();
  const teacher = useTeacher();
  const classes = useClasses();
  const schedule = useSchedule();
  const calendar = useCalendar();
  const tax = useTaxonomy(teacher.data?.profile.stage);
  const card = useQuery({ queryKey: ["teacherCard", uid ?? ""], queryFn: () => getCard(uid!), enabled: !!uid });
  const [notebook, setNotebook] = useState<Notebook>("daily");
  const [picked, setPicked] = useState<Set<Section>>(new Set(DEFAULTS.daily));
  const [editingCard, setEditingCard] = useState(false);

  if (!teacher.data || !classes.data || !schedule.data || !calendar.data || !tax.data || !card.data) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }

  const toggle = (s: Section) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  const chosen = SECTIONS.filter((s) => picked.has(s));

  return (
    <>
      <div className="space-y-4 pb-4 print:hidden">
        <p className="text-muted">{t("intro")}</p>
        <Card className="space-y-4">
          <SelectField
            label={t("notebook")}
            value={notebook}
            onChange={(e) => {
              const n = e.target.value as Notebook;
              setNotebook(n);
              setPicked(new Set(DEFAULTS[n]));
            }}
          >
            {NOTEBOOKS.map((n) => (
              <option key={n} value={n}>{t(`coverTitles.${n}`)}</option>
            ))}
          </SelectField>
          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-sm font-medium">{t("pages")}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SECTIONS.map((s) => (
                <label
                  key={s}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 ring-1",
                    picked.has(s) ? "bg-brand-50 ring-brand-300" : "ring-line",
                  )}
                >
                  <input type="checkbox" checked={picked.has(s)} onChange={() => toggle(s)} className="size-5 accent-brand-700" />
                  <span className="text-sm font-medium">{t(`sections.${s}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => window.print()} disabled={!chosen.length} className={buttonClass("primary")}>
              <Printer aria-hidden className="size-4" />
              {t("print")}
            </button>
            <button type="button" onClick={() => setEditingCard((v) => !v)} className={buttonClass("secondary")}>
              <IdCard aria-hidden className="size-4" />
              {editingCard ? t("close") : t("edit")}
            </button>
          </div>
        </Card>
        {editingCard && <CardForm initial={card.data} onDone={() => setEditingCard(false)} />}
        {picked.has("timetable") && schedule.data.length === 0 && <p className="text-sm text-muted">{t("noSchedule")}</p>}
      </div>

      <div className="hidden text-[11pt] print:block">
        <style>{"@page { size: A4 portrait; margin: 12mm; }"}</style>
        {chosen.map((s) => (
          <section key={s} className="break-after-page last:break-after-auto">
            {s === "cover" && <Cover notebook={notebook} />}
            {s === "card" && <CardPage card={card.data!} />}
            {s === "students" && <StudentLists classes={classes.data!.filter((c) => !c.archived)} />}
            {s === "timetable" && <Timetable slots={schedule.data!} cal={calendar.data!} taxonomy={tax.data!} classes={classes.data!} />}
            {s === "load" && <Load slots={schedule.data!} taxonomy={tax.data!} />}
            {s === "holidays" && <Holidays cal={calendar.data!} />}
            {s === "surahs" && <BlankList title={t("sections.surahs")} col={t("surah")} />}
            {s === "songs" && <BlankList title={t("sections.songs")} col={t("song")} />}
          </section>
        ))}
      </div>
    </>
  );
}

function CardForm({ initial, onDone }: { initial: TeacherCard; onDone: () => void }) {
  const t = useTranslations("logbook.front");
  const uid = useUid();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    setState("saving");
    try {
      await saveCard(uid, draft);
      queryClient.setQueryData(["teacherCard", uid], draft);
      setState("saved");
      onDone();
    } catch {
      setState("error");
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <h2 className="font-semibold">{t("cardTitle")}</h2>
          <p className="text-sm text-muted">{t("cardHint")}</p>
        </div>
        {CARD_GROUPS.map((g) => (
          <fieldset key={g} className="space-y-3">
            <legend className="mb-1 text-sm font-semibold text-brand-800">{t(`groups.${g}`)}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {CARD_FIELDS.filter((f) => f.group === g).map((f) => (
                <Field
                  key={f.key}
                  label={t(`fields.${f.key}`)}
                  type={f.type}
                  dir={f.type === "tel" ? "ltr" : "auto"}
                  maxLength={CARD_MAX}
                  value={draft[f.key]}
                  onChange={(e) => {
                    setDraft({ ...draft, [f.key]: e.target.value });
                    setState("idle");
                  }}
                />
              ))}
            </div>
          </fieldset>
        ))}
        {state === "error" && <p role="alert" className="text-sm text-red-700">{t("cardSave")} ✕</p>}
        <button type="submit" disabled={state === "saving"} className={buttonClass("primary")}>
          {state === "saving" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : state === "saved" && <Check aria-hidden className="size-4" />}
          {state === "saved" ? t("cardSaved") : t("cardSave")}
        </button>
      </form>
    </Card>
  );
}

// ── صفحات الطباعة ──

function useIdentity() {
  const locale = useLocale() as "ar" | "fr";
  const { profile, school } = useTeacher().data!;
  return {
    locale,
    name: `${profile.lastName} ${profile.firstName}`,
    lastName: profile.lastName,
    firstName: profile.firstName,
    grade: gradeLabel(profile.stage, profile.gradeId, profile.gradeCustom, locale),
    school: school?.name ?? "",
    directorate: school?.directorate ?? profile.directorate,
    year: parseAcademicYearId(profile.activeYearId)?.label ?? "",
  };
}

function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="mb-5 border-b-2 border-ink pb-2 text-center text-[17pt] font-bold">{children}</h1>;
}

function Cover({ notebook }: { notebook: Notebook }) {
  const t = useTranslations("logbook.front");
  const id = useIdentity();
  return (
    <div className="flex h-[265mm] flex-col items-center justify-between py-6 text-center">
      <div className="space-y-1 text-[12pt] font-semibold">
        <p>{t("republic")}</p>
        <p>{t("ministry")}</p>
        <p className="font-normal">{id.directorate}</p>
        <p className="font-normal">{id.school}</p>
      </div>
      <div className="w-full border-4 border-double border-ink px-6 py-14">
        <p className="text-[34pt] font-bold leading-tight">{t(`coverTitles.${notebook}`)}</p>
      </div>
      <div className="space-y-1 text-[13pt]">
        <p className="font-bold">{id.name}</p>
        {id.grade && <p>{id.grade}</p>}
        <p className="pt-3">
          {t("yearLabel")}: <bdi dir="ltr" className="font-bold">{id.year}</bdi>
        </p>
      </div>
    </div>
  );
}

function CardPage({ card }: { card: TeacherCard }) {
  const t = useTranslations("logbook.front");
  const id = useIdentity();
  const value = (key: string, v: string, type?: string) => (v ? (type === "date" ? <bdi dir="ltr">{dmy(v)}</bdi> : <bdi>{v}</bdi>) : dots);
  const rows: Record<(typeof CARD_GROUPS)[number], [string, React.ReactNode][]> = {
    personal: [
      [t("fields.lastName"), id.lastName],
      [t("fields.firstName"), id.firstName],
      ...CARD_FIELDS.filter((f) => f.group === "personal").map((f) => [t(`fields.${f.key}`), value(f.key, card[f.key], f.type)] as [string, React.ReactNode]),
    ],
    career: [
      [t("fields.grade"), id.grade || dots],
      ...CARD_FIELDS.filter((f) => f.group === "career").map((f) => [t(`fields.${f.key}`), value(f.key, card[f.key], f.type)] as [string, React.ReactNode]),
    ],
    inspection: CARD_FIELDS.filter((f) => f.group === "inspection").map((f) => [t(`fields.${f.key}`), value(f.key, card[f.key], f.type)]),
    step: CARD_FIELDS.filter((f) => f.group === "step").map((f) => [t(`fields.${f.key}`), value(f.key, card[f.key], f.type)]),
  };
  return (
    <div>
      <PageTitle>{t("cardTitle")}</PageTitle>
      {CARD_GROUPS.map((g) => (
        <div key={g} className="mb-5 rounded-lg border border-ink px-4 py-3">
          <p className="mb-2 font-bold">{t(`groups.${g}`)}</p>
          <dl className="space-y-2">
            {rows[g].map(([label, v]) => (
              <div key={label} className="flex gap-2">
                <dt className="shrink-0 font-semibold">{label}:</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

function StudentLists({ classes }: { classes: ClassDoc[] }) {
  const t = useTranslations("logbook.front");
  const lists = classes.length ? classes : [null];
  return (
    <>
      {lists.map((c, ci) => {
        const roster = c?.roster ?? [];
        const rows = Math.max(roster.length, 30);
        return (
          <div key={c?.id ?? "blank"} className={ci < lists.length - 1 ? "break-after-page" : undefined}>
            <PageTitle>
              {t("studentsTitle")}
              {c && (
                <>
                  {" — "}
                  <bdi dir="ltr">{c.displayName}</bdi>
                </>
              )}
            </PageTitle>
            <table className="w-full border-collapse text-[10pt]">
              <thead>
                <tr className="bg-canvas">
                  <th className="w-12 border border-ink px-1 py-1">{t("num")}</th>
                  <th className="border border-ink px-2 py-1">{t("fullName")}</th>
                  <th className="w-28 border border-ink px-2 py-1">{t("birth")}</th>
                  <th className="w-[30%] border border-ink px-2 py-1">{t("remarks")}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rows }, (_, i) => {
                  const s = roster[i];
                  return (
                    <tr key={s?.id ?? `pad-${i}`}>
                      <td className="h-[7mm] border border-ink text-center">{String(i + 1).padStart(2, "0")}</td>
                      <td className="border border-ink px-2">{s ? <bdi>{`${s.last} ${s.first}`}</bdi> : null}</td>
                      <td className="border border-ink" />
                      <td className="border border-ink" />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}

function Timetable({ slots, cal, taxonomy, classes }: { slots: Slot[]; cal: Calendar; taxonomy: StageTaxonomy; classes: ClassDoc[] }) {
  const t = useTranslations("logbook.front");
  const ts = useTranslations("schedule");
  const locale = useLocale() as "ar" | "fr";
  const dayNames = ts.raw("days") as string[];
  const days = [...cal.schoolDays].sort((a, b) => a - b);
  const multiClass = new Set(slots.map((s) => s.classId)).size > 1;
  const classById = new Map(classes.map((c) => [c.id, c]));
  const label = (s: Slot) => {
    const subject = subjectById(taxonomy, s.subjectId)?.label[locale] ?? s.subjectId;
    return multiClass ? `${subject} (${classById.get(s.classId)?.displayName ?? ""})` : subject;
  };
  return (
    <div>
      <PageTitle>{t("sections.timetable")}</PageTitle>
      {(["am", "pm"] as const).map((p) => {
        const grid = timetableGrid(slots, p);
        const ranges = grid.ranges.length ? grid.ranges : Array.from({ length: 4 }, () => null);
        return (
          <table key={p} className="mb-6 w-full border-collapse text-[10pt]">
            <caption className="pb-1 text-center text-[12pt] font-bold">{t(p === "am" ? "morning" : "afternoon")}</caption>
            <thead>
              <tr className="bg-canvas">
                <th className="w-24 border border-ink px-1 py-1">{t("time")}</th>
                {days.map((d) => (
                  <th key={d} className="border border-ink px-1 py-1">{dayNames[d]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranges.map((r, i) => (
                <tr key={r ? `${r.start}-${r.end}` : i}>
                  <td className="h-12 border border-ink text-center whitespace-nowrap">{r && <bdi dir="ltr">{r.start}–{r.end}</bdi>}</td>
                  {days.map((d) => (
                    <td key={d} className="border border-ink px-1 text-center">
                      {r && grid.cell(d, r).map(label).join(" / ")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      })}
    </div>
  );
}

function Load({ slots, taxonomy }: { slots: Slot[]; taxonomy: StageTaxonomy }) {
  const t = useTranslations("logbook.front");
  const locale = useLocale() as "ar" | "fr";
  const load = subjectLoad(slots);
  const total = load.reduce((a, l) => ({ sessions: a.sessions + l.sessions, minutes: a.minutes + l.minutes }), { sessions: 0, minutes: 0 });
  const pad = Math.max(0, 12 - load.length);
  return (
    <div>
      <PageTitle>{t("sections.load")}</PageTitle>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-canvas">
            <th className="border border-ink px-2 py-1.5">{t("subject")}</th>
            <th className="w-32 border border-ink px-2 py-1.5">{t("sessions")}</th>
            <th className="w-44 border border-ink px-2 py-1.5">{t("weekly")}</th>
          </tr>
        </thead>
        <tbody>
          {load.map((l) => (
            <tr key={l.subjectId}>
              <td className="border border-ink px-2 py-1.5">{subjectById(taxonomy, l.subjectId)?.label[locale] ?? l.subjectId}</td>
              <td className="border border-ink px-2 py-1.5 text-center">{l.sessions}</td>
              <td className="border border-ink px-2 py-1.5 text-center"><bdi dir="ltr">{formatHours(l.minutes)}</bdi></td>
            </tr>
          ))}
          {Array.from({ length: pad }, (_, i) => (
            <tr key={`pad-${i}`}>
              <td className="h-8 border border-ink" />
              <td className="border border-ink" />
              <td className="border border-ink" />
            </tr>
          ))}
          <tr className="bg-canvas font-bold">
            <td className="border border-ink px-2 py-1.5">{t("total")}</td>
            <td className="border border-ink px-2 py-1.5 text-center">{total.sessions || ""}</td>
            <td className="border border-ink px-2 py-1.5 text-center">{total.minutes ? <bdi dir="ltr">{formatHours(total.minutes)}</bdi> : ""}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Holidays({ cal }: { cal: Calendar }) {
  const t = useTranslations("logbook.front");
  const locale = useLocale() as "ar" | "fr";
  const known = cal.holidays;
  // بلا رزنامة رسمية بعد: العطل الثلاث الكبرى بنقاط تُكمَل يدويًا
  const blanks = known.length ? [] : [t("autumn"), t("winter"), t("spring")];
  const pad = Math.max(0, 12 - known.length - blanks.length);
  return (
    <div>
      <PageTitle>{t("holidaysTitle")}</PageTitle>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-canvas">
            <th className="w-12 border border-ink px-1 py-1.5">{t("num")}</th>
            <th className="border border-ink px-2 py-1.5">{t("holiday")}</th>
            <th className="w-32 border border-ink px-2 py-1.5">{t("from")}</th>
            <th className="w-32 border border-ink px-2 py-1.5">{t("to")}</th>
          </tr>
        </thead>
        <tbody>
          {known.map((h, i) => (
            <tr key={`${h.start}-${i}`}>
              <td className="border border-ink text-center">{String(i + 1).padStart(2, "0")}</td>
              <td className="border border-ink px-2 py-1.5">{h.label?.[locale] ?? ""}</td>
              <td className="border border-ink text-center"><bdi dir="ltr">{dmy(h.start)}</bdi></td>
              <td className="border border-ink text-center"><bdi dir="ltr">{dmy(h.end)}</bdi></td>
            </tr>
          ))}
          {[...blanks, ...Array.from({ length: pad }, () => "")].map((label, i) => (
            <tr key={`b-${i}`}>
              <td className="h-8 border border-ink text-center">{String(known.length + i + 1).padStart(2, "0")}</td>
              <td className="border border-ink px-2">{label}</td>
              <td className="border border-ink" />
              <td className="border border-ink" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BlankList({ title, col }: { title: string; col: string }) {
  const t = useTranslations("logbook.front");
  const half = (offset: number) => (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-canvas">
          <th className="w-12 border border-ink px-1 py-1.5">{t("num")}</th>
          <th className="border border-ink px-2 py-1.5">{col}</th>
          <th className="w-16 border border-ink px-1 py-1.5">{t("page")}</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 20 }, (_, i) => (
          <tr key={i}>
            <td className="h-9 border border-ink text-center">{String(offset + i + 1).padStart(2, "0")}</td>
            <td className="border border-ink" />
            <td className="border border-ink" />
          </tr>
        ))}
      </tbody>
    </table>
  );
  return (
    <div>
      <PageTitle>{title}</PageTitle>
      <div className="grid grid-cols-2 gap-4">
        {half(0)}
        {half(20)}
      </div>
    </div>
  );
}
