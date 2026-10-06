"use client";

import { doc, getDoc } from "firebase/firestore";
import { useQueries, useQuery } from "@tanstack/react-query";
import { getFirebase } from "@/lib/firebase/client";
import { useAuth } from "@/features/auth/auth-provider";
import { useBilling } from "@/features/billing/repo";
import { useClasses, useTaxonomy } from "@/features/classes/hooks";
import { subjectById } from "@/shared/taxonomy/taxonomy";
import { curriculumId, lessonAccess, type Curriculum, type LessonSummary } from "./logic";

const db = () => getFirebase().db;

export async function getCurriculum(id: string): Promise<Curriculum | null> {
  const snap = await getDoc(doc(db(), "curriculum", id)).catch(() => null);
  return snap?.exists() ? ({ id: snap.id, ...snap.data() } as Curriculum) : null;
}

/** الحقل غير مسموح له (قواعد Firestore) ⇐ null: الواجهة تعرض القفل. */
async function getOrNull<T>(path: string): Promise<T | null> {
  try {
    const snap = await getDoc(doc(db(), path));
    return snap.exists() ? (snap.data() as T) : null;
  } catch {
    return null;
  }
}

export function useCurriculum(id: string) {
  return useQuery({ queryKey: ["curriculum", id], queryFn: () => getCurriculum(id), staleTime: 60 * 60_000 });
}

/** المناهج التي تخصّ أقسام الأستاذ (مستوى × مادة)، متوفرة أو «قريبًا». */
export function useMyCurricula() {
  const classes = useClasses();
  const tax = useTaxonomy("primary");
  const pairs = new Map<string, { level: string; subject: string }>();
  for (const c of classes.data ?? []) {
    if (c.archived) continue;
    // مادة لم تعد مقرّرة لمستوى القسم (مثل الفرنسية في الثالثة) لا تُعرض ولو بقيت في قسم قديم
    for (const s of c.subjectIds) {
      const subj = tax.data && subjectById(tax.data, s);
      if (tax.data && subj && !subj.levels.includes(c.level)) continue;
      pairs.set(curriculumId(c.level, s), { level: c.level, subject: s });
    }
  }
  const ids = [...pairs.keys()].sort();
  const found = useQuery({
    queryKey: ["curricula", ids.join(",")],
    queryFn: async () => new Set((await Promise.all(ids.map(getCurriculum))).filter((c): c is Curriculum => !!c).map((c) => c.id)),
    enabled: classes.isSuccess && tax.isSuccess,
    staleTime: 60 * 60_000,
  });
  return { ready: classes.isSuccess && tax.isSuccess && found.isSuccess, list: ids.map((id) => ({ id, ...pairs.get(id)!, available: !!found.data?.has(id) })) };
}

export function useLessonAccessFor(sample: boolean) {
  const auth = useAuth();
  const { access } = useBilling();
  const staff = auth.status === "signedIn" && (auth.roles.includes("admin") || auth.roles.includes("contentEditor"));
  return lessonAccess(access, sample, staff);
}

/** نقرأ فقط ما تسمح به القواعد (لا طلبات مرفوضة بلا فائدة). */
export function useLesson(lessonId: string, can: { summary: boolean; body: boolean }) {
  const summary = useQuery({
    queryKey: ["lessonSummary", lessonId],
    queryFn: () => getOrNull<LessonSummary>(`lessonSummaries/${lessonId}`),
    enabled: can.summary,
    staleTime: 60 * 60_000,
  });
  const body = useQuery({
    queryKey: ["lessonBody", lessonId],
    queryFn: () => getOrNull<{ body: string; pages?: string[] }>(`lessonBodies/${lessonId}`),
    enabled: can.body,
    staleTime: 60 * 60_000,
  });
  return { summary, body };
}

/** صور صفحات الوثيقة الأصلية لحصة (نفس حماية السير المكتوب). */
export function useLessonPages(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ["lessonPage", id],
      queryFn: () => getOrNull<{ img: string; page: number }>(`lessonBodies/${id}`),
      staleTime: Infinity,
    })),
  });
}
