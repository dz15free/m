"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { CircleAlert, Copy, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectField } from "@/components/ui/field";
import { useClasses, useTaxonomy, useTeacher, useUid } from "@/features/classes/hooks";
import type { ClassDoc } from "@/features/classes/repo";
import { levelById, subjectById, type StageTaxonomy } from "@/shared/taxonomy/taxonomy";
import { cn } from "@/lib/utils/cn";
import { todayInAlgiers } from "@/features/attendance/logic";
import { bySlotTime, copyDay, fromMinutes, isValidTime, newSlotId, overlaps, toMinutes, weekdayOf, type Slot } from "./logic";
import { saveSchedule, scheduleKey, useCalendar, useSchedule } from "./repo";

type Draft = Omit<Slot, "id"> & { id: string | null };

export function ScheduleEditor() {
  const teacher = useTeacher();
  const classes = useClasses();
  const schedule = useSchedule();
  const calendar = useCalendar();
  const tax = useTaxonomy(teacher.data?.profile.stage);

  if (!teacher.data || !classes.data || !schedule.data || !calendar.data || !tax.data) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  return (
    <Editor
      yearId={teacher.data.profile.activeYearId}
      classes={classes.data}
      initial={schedule.data}
      schoolDays={calendar.data.schoolDays}
      taxonomy={tax.data}
    />
  );
}

function Editor({
  yearId,
  classes,
  initial,
  schoolDays,
  taxonomy,
}: {
  yearId: string;
  classes: ClassDoc[];
  initial: Slot[];
  schoolDays: number[];
  taxonomy: StageTaxonomy;
}) {
  const t = useTranslations("schedule");
  const locale = useLocale() as "ar" | "fr";
  const uid = useUid();
  const queryClient = useQueryClient();
  const days = t.raw("days") as string[];

  const [slots, setSlots] = useState<Slot[]>(initial);
  const [day, setDay] = useState(() => {
    const today = weekdayOf(todayInAlgiers());
    return schoolDays.includes(today) ? today : schoolDays[0] ?? 0;
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const classById = new Map(classes.map((c) => [c.id, c]));
  const daySlots = slots.filter((s) => s.day === day).sort(bySlotTime);
  const order = (c: ClassDoc) => (levelById(taxonomy, c.level)?.order ?? 99) * 100 + Number.parseInt(c.section, 10);
  const sortedClasses = [...classes].sort((a, b) => order(a) - order(b));

  async function persist(next: Slot[]) {
    if (!uid) return;
    const previous = slots;
    setSlots(next);
    setStatus("saving");
    try {
      await saveSchedule(uid, yearId, next);
      queryClient.setQueryData(scheduleKey(uid, yearId), next);
      setStatus("saved");
    } catch {
      setSlots(previous);
      setStatus("error");
    }
  }

  function startAdd() {
    const last = daySlots[daySlots.length - 1];
    const start = last ? last.end : "08:00";
    const cls = last ? classById.get(last.classId) : sortedClasses[0];
    setDraft({
      id: null,
      day,
      start,
      end: fromMinutes(Math.min(toMinutes(start) + 60, 23 * 60 + 59)),
      classId: cls?.id ?? "",
      subjectId: cls?.subjectIds[0] ?? "",
    });
  }

  if (classes.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-muted">{t("noClasses")}</p>
        <Link href="/app/classes/new" className={buttonClass("primary")}>
          <Plus aria-hidden className="size-4" />
          {t("addClasses")}
        </Link>
      </Card>
    );
  }

  const valid = draft && isValidTime(draft.start) && isValidTime(draft.end) && toMinutes(draft.end) > toMinutes(draft.start);
  const clash = draft && valid && slots.some((s) => s.id !== draft.id && overlaps(s, draft));

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">{t("perWeek", { count: slots.length })}</p>
        {status !== "idle" && (
          <span role="status" className={cn("text-xs font-medium", status === "error" ? "text-red-700" : "text-muted")}>
            {t(status)}
          </span>
        )}
      </div>

      {/* الأيام */}
      <div role="tablist" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${schoolDays.length}, minmax(0, 1fr))` }}>
        {schoolDays.map((d) => {
          const n = slots.filter((s) => s.day === d).length;
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={day === d}
              onClick={() => {
                setDay(d);
                setDraft(null);
              }}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center rounded-2xl px-1 text-[13px] font-medium ring-1 sm:flex-row sm:gap-2 sm:text-sm",
                day === d ? "bg-brand-700 text-white ring-brand-700" : "bg-surface ring-line",
              )}
            >
              {days[d]}
              <span className={cn("rounded-full px-1.5 text-[11px] leading-4", n ? (day === d ? "bg-white/20" : "bg-brand-50 text-brand-800") : "invisible")}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* حصص اليوم */}
      <ul className="space-y-2">
        {daySlots.length === 0 && !draft && <li className="rounded-card bg-surface p-6 text-center text-sm text-muted shadow-card">{t("empty")}</li>}
        {daySlots.map((s) => {
          if (draft?.id === s.id) return null;
          const cls = classById.get(s.classId);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setDraft({ ...s })}
                className="flex w-full items-center gap-4 rounded-card bg-surface p-4 text-start shadow-card transition-shadow hover:shadow-md"
              >
                <bdi dir="ltr" className="shrink-0 whitespace-nowrap font-semibold tabular-nums">
                  {s.start}–{s.end}
                </bdi>
                <span className="min-w-0 flex-1">
                  <bdi dir="ltr" className="block font-bold">
                    {cls?.displayName ?? "—"}
                  </bdi>
                  <span className="block truncate text-sm text-muted">{subjectById(taxonomy, s.subjectId)?.label[locale] ?? s.subjectId}</span>
                </span>
                <Pencil aria-hidden className="size-4 shrink-0 text-muted" />
              </button>
            </li>
          );
        })}
      </ul>

      {/* نموذج الإضافة/التعديل */}
      {draft ? (
        <Card className="space-y-3 ring-2 ring-brand-200">
          <h2 className="font-semibold">{draft.id ? t("edit") : t("add")}</h2>
          <div className="grid grid-cols-2 gap-3">
            {(["start", "end"] as const).map((k) => (
              <label key={k} className="space-y-1.5">
                <span className="block text-sm font-medium">{t(k)}</span>
                <input
                  type="time"
                  value={draft[k]}
                  onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                  step={300}
                  dir="ltr"
                  className="block min-h-12 w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand-600"
                />
              </label>
            ))}
          </div>
          <SelectField
            label={t("class")}
            value={draft.classId}
            onChange={(e) => {
              const c = classById.get(e.target.value);
              setDraft({ ...draft, classId: e.target.value, subjectId: c?.subjectIds.includes(draft.subjectId) ? draft.subjectId : c?.subjectIds[0] ?? "" });
            }}
          >
            {sortedClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </SelectField>
          <SelectField label={t("subject")} value={draft.subjectId} onChange={(e) => setDraft({ ...draft, subjectId: e.target.value })}>
            {(classById.get(draft.classId)?.subjectIds ?? []).map((id) => (
              <option key={id} value={id}>
                {subjectById(taxonomy, id)?.label[locale] ?? id}
              </option>
            ))}
          </SelectField>

          {!valid && <p className="flex items-center gap-2 text-sm text-red-700"><CircleAlert aria-hidden className="size-4" />{t("invalidTime")}</p>}
          {clash && <p className="flex items-center gap-2 text-sm text-amber-800"><CircleAlert aria-hidden className="size-4" />{t("overlap")}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!valid || !draft.classId || !draft.subjectId}
              onClick={() => {
                const slot: Slot = { ...draft, id: draft.id ?? newSlotId() };
                persist([...slots.filter((s) => s.id !== slot.id), slot]);
                setDraft(null);
              }}
              className={buttonClass("primary")}
            >
              {t("save")}
            </button>
            <button type="button" onClick={() => setDraft(null)} className={buttonClass("secondary")}>
              {t("cancel")}
            </button>
            {draft.id && (
              <button
                type="button"
                onClick={() => {
                  persist(slots.filter((s) => s.id !== draft.id));
                  setDraft(null);
                }}
                className={buttonClass("secondary", "md", "ms-auto text-red-700 ring-red-200 hover:bg-red-50")}
              >
                <Trash2 aria-hidden className="size-4" />
                {t("delete")}
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={startAdd} className={buttonClass("primary", "lg", "flex-1 sm:flex-none")}>
            <Plus aria-hidden className="size-5" />
            {t("add")}
          </button>
          {daySlots.length > 0 && (
            <label className={buttonClass("secondary", "lg", "relative")}>
              <Copy aria-hidden className="size-4" />
              {t("copyDay")}
              <select
                value=""
                onChange={(e) => {
                  const to = Number(e.target.value);
                  if (Number.isNaN(to) || !confirm(t("copyConfirm", { day: days[to] ?? "" }))) return;
                  persist(copyDay(slots, day, to));
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label={t("copyDay")}
              >
                <option value="" />
                {schoolDays.filter((d) => d !== day).map((d) => (
                  <option key={d} value={d}>
                    {days[d]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
