"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  BarChart3,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  CloudOff,
  FileCheck2,
  LoaderCircle,
  UserPlus,
  X,
} from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useClass, useTaxonomy, useTeacher, useUid } from "@/features/classes/hooks";
import type { ClassDoc } from "@/features/classes/repo";
import { formatLongDate } from "@/i18n/dates";
import type { Locale } from "@/i18n/config";
import { subjectById } from "@/shared/taxonomy/taxonomy";
import { cn } from "@/lib/utils/cn";
import {
  countMarks,
  isIsoDate,
  nextStatus,
  pruneMap,
  sessionKey,
  setStatus,
  shiftDate,
  statusOf,
  todayInAlgiers,
  type AttendanceMap,
  type Status,
} from "./logic";
import { getSession, saveSession } from "./repo";

const SAVE_DELAY = 700;

const STATUS_UI: Record<Status, { icon: typeof Check; on: string; row: string }> = {
  P: { icon: Check, on: "bg-present text-white", row: "" },
  A: { icon: X, on: "bg-absent text-white", row: "bg-red-50" },
  L: { icon: Clock, on: "bg-late text-white", row: "bg-amber-50" },
  E: { icon: FileCheck2, on: "bg-excused text-white", row: "bg-blue-50" },
};
const LABEL: Record<Status, "present" | "absent" | "late" | "excused"> = { P: "present", A: "absent", L: "late", E: "excused" };

export function AttendanceSheet({ classId, initialDate, initialPart }: { classId: string; initialDate?: string; initialPart?: string }) {
  const cls = useClass(classId);
  const teacher = useTeacher();
  const tax = useTaxonomy(cls.data?.stage);
  if (!cls.data || !teacher.data || !tax.data) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  // معلّم القسم يسجّل الحضور لنصف اليوم؛ أستاذ المادة لكل مادة
  const halfDays = teacher.data.profile.presetType === "primaryGeneralist" || cls.data.subjectIds.length === 0;
  const parts = halfDays
    ? [{ id: "am", label: null }, { id: "pm", label: null }]
    : cls.data.subjectIds.map((s) => ({ id: s, label: subjectById(tax.data!, s)?.label ?? null }));
  return <Sheet cls={cls.data} parts={parts} initialDate={initialDate} initialPart={initialPart} />;
}

type Part = { id: string; label: { ar: string; fr: string } | null };

function Sheet({ cls, parts, initialDate, initialPart }: { cls: ClassDoc; parts: Part[]; initialDate?: string; initialPart?: string }) {
  const t = useTranslations("attendance");
  const locale = useLocale() as Locale;
  const uid = useUid();
  const queryClient = useQueryClient();
  const roster = cls.roster ?? [];
  const ids = roster.map((s) => s.id);
  const Prev = locale === "ar" ? ChevronRight : ChevronLeft;
  const Next = locale === "ar" ? ChevronLeft : ChevronRight;

  const [date, setDate] = useState(() => (initialDate && isIsoDate(initialDate) ? initialDate : todayInAlgiers()));
  const [part, setPart] = useState(() => {
    if (initialPart && parts.some((p) => p.id === initialPart)) return initialPart;
    return parts.length === 2 && parts[0]!.id === "am" ? (new Date().getHours() < 12 ? "am" : "pm") : parts[0]!.id;
  });
  const [map, setMap] = useState<AttendanceMap>({});
  const [held, setHeld] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "offline" | "error">("idle");

  // آخر نسخة محفوظة (لحساب فروق الإحصائيات) والحفظ المؤجَّل
  const saved = useRef<{ map: AttendanceMap; rosterSize: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ key: string; date: string; part: string; map: AttendanceMap } | null>(null);

  function flush() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const job = pending.current;
    pending.current = null;
    if (!job || !uid) return;
    const prev = saved.current;
    const clean = pruneMap(job.map, ids);
    saved.current = { map: clean, rosterSize: ids.length };
    setSaveState(navigator.onLine ? "saving" : "offline");
    saveSession(uid, job.key, { date: job.date, classId: cls.id, part: job.part, attendance: clean, counts: countMarks(ids, clean), rosterSize: ids.length }, prev)
      .then(() => {
        setSaveState((st) => (st === "saving" || st === "offline" ? "saved" : st));
        queryClient.invalidateQueries({ queryKey: ["attendanceStats", uid, cls.id] });
        queryClient.invalidateQueries({ queryKey: ["session", uid, job.key] });
      })
      .catch(() => setSaveState("error"));
  }

  // أحدث نسخة من flush للحفظ الفوري عند مغادرة الصفحة
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });

  // تحميل الحصة عند تغيير التاريخ أو الجزء (بعد حفظ ما كان معلّقًا)
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    getSession(uid, sessionKey(date, cls.id, part)).then((s) => {
      if (!alive) return;
      setMap(s?.attendance ?? {});
      setHeld(!!s);
      saved.current = s ? { map: s.attendance, rosterSize: s.rosterSize } : null;
      setLoading(false);
      setSaveState("idle");
    });
    return () => {
      alive = false;
    };
  }, [uid, cls.id, date, part]);

  // حفظ فوري عند مغادرة الصفحة
  useEffect(() => () => flushRef.current(), []);

  function change(nextMap: AttendanceMap) {
    setMap(nextMap);
    setHeld(true);
    pending.current = { key: sessionKey(date, cls.id, part), date, part, map: nextMap };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY);
  }

  function go(nextDate: string, nextPart = part) {
    // اختيار الحصة الحالية نفسها لا يغيّر شيئًا (ولا يجب أن يعلّق الشاشة في «التحميل»)
    if (!isIsoDate(nextDate) || (nextDate === date && nextPart === part)) return;
    flush();
    setLoading(true);
    setDate(nextDate);
    setPart(nextPart);
  }

  const counts = countMarks(ids, map);
  const allPresent = held && counts.p === ids.length;

  if (roster.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="font-semibold">{t("noStudents")}</p>
        <Link href={`/app/classes/${cls.id}/students`} className={buttonClass("primary")}>
          <UserPlus aria-hidden className="size-4" />
          {t("addStudents")}
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* التاريخ والحصة */}
      <Card className="space-y-3 p-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => go(shiftDate(date, -1))} aria-label={t("prevDay")} className="grid size-11 place-items-center rounded-full hover:bg-canvas">
            <Prev aria-hidden className="size-5" />
          </button>
          <label className="relative min-w-0 flex-1 text-center">
            <span className="block truncate font-semibold">{formatLongDate(new Date(`${date}T12:00:00`), locale)}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => go(e.target.value)}
              aria-label={t("date")}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <button type="button" onClick={() => go(shiftDate(date, 1))} aria-label={t("nextDay")} className="grid size-11 place-items-center rounded-full hover:bg-canvas">
            <Next aria-hidden className="size-5" />
          </button>
        </div>
        {date !== todayInAlgiers() && (
          <button type="button" onClick={() => go(todayInAlgiers())} className="mx-auto block text-sm font-medium text-brand-700">
            {t("today")}
          </button>
        )}
        {parts.length > 1 && (
          <div role="group" aria-label={t("part")} className="flex flex-wrap justify-center gap-2">
            {parts.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={part === p.id}
                onClick={() => go(date, p.id)}
                className={cn(
                  "min-h-10 rounded-full px-4 text-sm font-medium ring-1",
                  part === p.id ? "bg-brand-700 text-white ring-brand-700" : "ring-line",
                )}
              >
                {p.label ? p.label[locale] : t(p.id as "am" | "pm")}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* الملخص + «الجميع حاضر» — ثابت أعلى الشاشة */}
      <div className="sticky top-14 z-10 space-y-2 rounded-card bg-surface/95 p-3 shadow-card backdrop-blur lg:top-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 text-sm font-medium" aria-live="polite">
            {held ? t("summary", counts) : t("notTaken")}
          </p>
          <SaveBadge state={saveState} />
        </div>
        <button
          type="button"
          onClick={() => change({})}
          disabled={loading}
          className={buttonClass(allPresent ? "secondary" : "primary", "lg", "w-full")}
        >
          <CheckCheck aria-hidden className="size-5" />
          {allPresent ? t("allPresentDone") : t("allPresent")}
        </button>
        {!held && <p className="text-center text-xs text-muted">{t("hint")}</p>}
      </div>

      {loading ? (
        <div role="status" className="grid place-items-center py-10">
          <LoaderCircle aria-hidden className="size-7 animate-spin text-brand-700" />
        </div>
      ) : (
        <ol className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
          {roster.map((s, i) => {
            const status = statusOf(map, s.id);
            return (
              <li key={s.id} className={cn("flex items-center gap-2 px-3 py-2 transition-colors", STATUS_UI[status].row)}>
                <button
                  type="button"
                  onClick={() => change(setStatus(map, s.id, nextStatus(status)))}
                  className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-start"
                >
                  <span className="w-6 shrink-0 text-center text-sm tabular-nums text-muted">{i + 1}</span>
                  <span className="line-clamp-2 leading-snug">
                    <span className="font-semibold">{s.last}</span> {s.first}
                  </span>
                </button>
                <div role="radiogroup" aria-label={`${s.last} ${s.first}`} className="flex shrink-0 gap-1">
                  {(["P", "A", "L", "E"] as Status[]).map((st) => {
                    const Icon = STATUS_UI[st].icon;
                    const on = status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={t(LABEL[st])}
                        title={t(LABEL[st])}
                        onClick={() => change(setStatus(map, s.id, st))}
                        className={cn(
                          "grid size-10 place-items-center rounded-full transition-colors",
                          on ? STATUS_UI[st].on : "text-muted/60 hover:bg-canvas",
                        )}
                      >
                        <Icon aria-hidden className="size-5" strokeWidth={on ? 2.6 : 2} />
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Link href={`/app/classes/${cls.id}/attendance/stats`} className={buttonClass("secondary", "md", "w-full")}>
        <BarChart3 aria-hidden className="size-4" />
        {t("stats")}
      </Link>
    </div>
  );
}

function SaveBadge({ state }: { state: "idle" | "saving" | "saved" | "offline" | "error" }) {
  const t = useTranslations("attendance");
  if (state === "idle") return null;
  const map = {
    saving: { icon: LoaderCircle, cls: "text-muted", spin: true, text: t("saving") },
    saved: { icon: Check, cls: "text-brand-700", spin: false, text: t("saved") },
    offline: { icon: CloudOff, cls: "text-amber-800", spin: false, text: t("offline") },
    error: { icon: CircleAlert, cls: "text-red-700", spin: false, text: t("error") },
  } as const;
  const { icon: Icon, cls, spin, text } = map[state];
  return (
    <span role="status" className={cn("flex items-center gap-1 text-xs font-medium", cls)}>
      <Icon aria-hidden className={cn("size-4", spin && "animate-spin")} />
      {text}
    </span>
  );
}
