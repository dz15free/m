"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarClock, ClipboardCheck, Coffee, LoaderCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useClasses, useTeacher } from "@/features/classes/hooks";
import { todayInAlgiers } from "@/features/attendance/logic";
import { attendancePart, currentAndNext, nowMinutesInAlgiers, slotsForDate } from "./logic";
import { useCalendar, useSchedule } from "./repo";
import { attendanceHref } from "./today-board";

/* الزرّ المركزي «الحصة»: يفتح الحصة الجارية (أو القادمة اليوم) مباشرة.
   إن لم توجد حصة: اختيار قسم لتسجيل الحضور يدويًا. */
export function SessionLauncher() {
  const t = useTranslations("session");
  const router = useRouter();
  const teacher = useTeacher();
  const classes = useClasses();
  const schedule = useSchedule();
  const calendar = useCalendar();

  const ready = teacher.data && classes.data && schedule.data && calendar.data;
  const today = todayInAlgiers();
  const target = (() => {
    if (!ready) return null;
    const daySlots = slotsForDate(schedule.data!, calendar.data!, today);
    const { current, next } = currentAndNext(daySlots, nowMinutesInAlgiers());
    return current ?? next;
  })();
  const halfDays = teacher.data?.profile.presetType === "primaryGeneralist";

  useEffect(() => {
    if (target) router.replace(attendanceHref(target.classId, today, attendancePart(target, halfDays)));
  }, [target, today, halfDays, router]);

  if (!ready || target) {
    return (
      <div role="status" className="grid place-items-center gap-3 py-16 text-muted">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
        {target && t("opening")}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        {schedule.data!.length === 0 ? (
          <>
            <CalendarClock aria-hidden className="size-8 text-brand-700" />
            <p className="text-muted">{t("noSchedule")}</p>
            <Link href="/app/schedule" className={buttonClass("primary")}>{t("setSchedule")}</Link>
          </>
        ) : (
          <>
            <Coffee aria-hidden className="size-8 text-brand-700" />
            <p className="text-muted">{t("noneToday")}</p>
          </>
        )}
      </Card>
      {classes.data!.length > 0 && (
        <section className="space-y-2">
          <p className="text-sm font-medium">{t("pickClass")}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {classes.data!.map((c) => (
              <li key={c.id}>
                <Link href={`/app/classes/${c.id}/attendance`} className="flex min-h-14 items-center gap-3 rounded-card bg-surface px-4 shadow-card hover:shadow-md">
                  <ClipboardCheck aria-hidden className="size-5 text-brand-700" />
                  <bdi dir="ltr" className="font-bold">{c.displayName}</bdi>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
