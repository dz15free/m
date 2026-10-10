"use client";

import { useQuery } from "@tanstack/react-query";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";
import { useTeacher, useUid } from "@/features/classes/hooks";
import { officialCalendar } from "@/shared/dz/school-calendar";
import { DEFAULT_CALENDAR, type Calendar, type Slot } from "./logic";

/* جدول التوقيت: مستند واحد لكل سنة دراسية (قراءة واحدة لكل الأسبوع).
   الرزنامة (أيام الدراسة والعطل والاختبارات) عامّة يضبطها الأدمن في academicYears/{id}؛
   قبل ضبطها: الأحد–الخميس مع العطل والاختبارات الرسمية المعروفة لتلك السنة (shared/dz/school-calendar). */

const scheduleRef = (uid: string, yearId: string) => doc(getFirebase().db, "teachers", uid, "schedules", yearId);

export async function getSchedule(uid: string, yearId: string): Promise<Slot[]> {
  const snap = await getDoc(scheduleRef(uid, yearId));
  return ((snap.data()?.slots as Slot[] | undefined) ?? []).filter(Boolean);
}

export async function saveSchedule(uid: string, yearId: string, slots: Slot[]): Promise<void> {
  await setDoc(scheduleRef(uid, yearId), { yearId, slots, updatedAt: serverTimestamp() });
}

export async function getCalendar(yearId: string): Promise<Calendar> {
  const official = officialCalendar(yearId);
  try {
    const snap = await getDoc(doc(getFirebase().db, "academicYears", yearId));
    const d = snap.data() as Partial<Calendar> | undefined;
    return {
      schoolDays: d?.schoolDays?.length ? d.schoolDays : DEFAULT_CALENDAR.schoolDays,
      holidays: d?.holidays?.length ? d.holidays : (official?.holidays ?? []),
      exams: d?.exams?.length ? d.exams : (official?.exams ?? []),
    };
  } catch {
    return { ...DEFAULT_CALENDAR, holidays: official?.holidays ?? [], exams: official?.exams ?? [] };
  }
}

export const scheduleKey = (uid: string, yearId: string) => ["schedule", uid, yearId] as const;

export function useSchedule() {
  const uid = useUid();
  const yearId = useTeacher().data?.profile.activeYearId;
  return useQuery({
    queryKey: scheduleKey(uid ?? "", yearId ?? ""),
    queryFn: () => getSchedule(uid!, yearId!),
    enabled: !!uid && !!yearId,
    staleTime: 5 * 60_000,
  });
}

export function useCalendar() {
  const yearId = useTeacher().data?.profile.activeYearId;
  return useQuery({
    queryKey: ["calendar", yearId ?? ""],
    queryFn: () => getCalendar(yearId!),
    enabled: !!yearId,
    staleTime: Infinity,
  });
}
