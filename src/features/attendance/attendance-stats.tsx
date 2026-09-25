"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, ClipboardCheck, LoaderCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useClass, useUid } from "@/features/classes/hooks";
import { cn } from "@/lib/utils/cn";
import { attendanceRate, totals } from "./logic";
import { getStats } from "./repo";

const MONTHS_DZ = ["جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان", "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function monthLabel(ym: string, locale: string) {
  const [y, m] = ym.split("-").map(Number);
  if (locale === "ar") return `${MONTHS_DZ[(m ?? 1) - 1]} ${y}`;
  return new Intl.DateTimeFormat("fr-DZ", { month: "long", year: "numeric" }).format(new Date(y!, (m ?? 1) - 1, 1));
}

const pct = (r: number | null) => (r === null ? "—" : `${Math.round(r * 100)}%`);

export function AttendanceStats({ classId }: { classId: string }) {
  const t = useTranslations("attendance");
  const locale = useLocale();
  const uid = useUid();
  const cls = useClass(classId);
  const stats = useQuery({
    queryKey: ["attendanceStats", uid ?? "", classId],
    queryFn: () => getStats(uid!, classId),
    enabled: !!uid,
  });
  const Back = locale === "ar" ? ChevronRight : ChevronLeft;

  if (!cls.data || !stats.data) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }

  const tot = totals(stats.data);
  const rate = attendanceRate(tot);
  const months = Object.entries(stats.data.m ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const roster = cls.data.roster ?? [];
  const byStudent = roster
    .map((s, i) => ({ ...s, n: i + 1, ...(stats.data!.s[s.id] ?? {}) }))
    .sort((a, b) => (b.a ?? 0) + (b.e ?? 0) - ((a.a ?? 0) + (a.e ?? 0)) || (b.l ?? 0) - (a.l ?? 0) || a.n - b.n);

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/app/classes/${classId}/attendance`} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-700">
          <Back aria-hidden className="size-4" />
          {t("title")} — <bdi dir="ltr">{cls.data.displayName}</bdi>
        </Link>
        <h1 className="text-2xl font-bold">{t("statsTitle")}</h1>
      </div>

      {tot.sessions === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-muted">{t("noStats")}</p>
          <Link href={`/app/classes/${classId}/attendance`} className={buttonClass("primary")}>
            <ClipboardCheck aria-hidden className="size-4" />
            {t("take")}
          </Link>
        </Card>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: t("rate"), value: pct(rate), accent: "text-brand-700" },
              { label: t("sessions"), value: tot.sessions, accent: "" },
              { label: t("absences"), value: tot.a, accent: "text-absent" },
              { label: t("lates"), value: tot.l, accent: "text-late" },
              { label: t("excuseds"), value: tot.e, accent: "text-excused" },
            ].map((k, i) => (
              <li key={k.label} className={cn("rounded-card bg-surface p-4 shadow-card", i === 0 && "col-span-2 sm:col-span-1")}>
                <p className="text-xs text-muted">{k.label}</p>
                <p className={cn("mt-1 text-2xl font-bold tabular-nums", k.accent)}>{k.value}</p>
              </li>
            ))}
          </ul>

          <Card className="space-y-3">
            <h2 className="font-semibold">{t("byMonth")}</h2>
            <ul className="space-y-2">
              {months.map(([ym, m]) => {
                const r = attendanceRate(m);
                return (
                  <li key={ym} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm">
                    <span>{monthLabel(ym, locale)}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-line" aria-hidden>
                      <span className="block h-full rounded-full bg-brand-600" style={{ width: `${Math.round((r ?? 0) * 100)}%` }} />
                    </span>
                    <span className="text-end font-semibold tabular-nums">{pct(r)}</span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="space-y-3 p-0">
            <div className="px-5 pt-5">
              <h2 className="font-semibold">{t("byStudent")}</h2>
              <p className="text-xs text-muted">{t("mostAbsent")}</p>
            </div>
            <table className="w-full text-sm">
              <thead className="border-y border-line bg-canvas text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">{t("student")}</th>
                  <th className="px-2 py-2 font-medium text-absent">{t("absent")}</th>
                  <th className="px-2 py-2 font-medium text-late">{t("late")}</th>
                  <th className="px-2 py-2 font-medium text-excused">{t("excused")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {byStudent.map((s) => (
                  <tr key={s.id} className={cn((s.a ?? 0) >= 3 && "bg-red-50/60")}>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold">{s.last}</span> {s.first}
                    </td>
                    <td className="px-2 text-center font-semibold tabular-nums text-absent">{s.a ?? 0}</td>
                    <td className="px-2 text-center tabular-nums text-late">{s.l ?? 0}</td>
                    <td className="px-2 text-center tabular-nums text-excused">{s.e ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
