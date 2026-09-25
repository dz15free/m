"use client";

import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/features/auth/auth-provider";
import { getTeacherBundle } from "@/features/profile/repo";
import { getFirebase } from "@/lib/firebase/client";
import type { Stage } from "@/shared/dz/education";
import { DEFAULT_TAXONOMY, type StageTaxonomy } from "@/shared/taxonomy/taxonomy";
import { getClass, listClasses } from "./repo";

/* استعلامات مُكاشة (TanStack Query): الصفحات تتشارك النتيجة بدل قراءة
   Firestore من جديد عند كل تنقّل. */

export function useUid(): string | null {
  const auth = useAuth();
  return auth.status === "signedIn" ? auth.user.uid : null;
}

export const keys = {
  teacher: (uid: string) => ["teacher", uid] as const,
  taxonomy: (stage: Stage) => ["taxonomy", stage] as const,
  classes: (uid: string, yearId: string) => ["classes", uid, yearId] as const,
  class: (uid: string, classId: string) => ["class", uid, classId] as const,
};

export function useTeacher() {
  const uid = useUid();
  return useQuery({
    queryKey: keys.teacher(uid ?? ""),
    queryFn: () => getTeacherBundle(uid!),
    enabled: !!uid,
    staleTime: 5 * 60_000,
  });
}

/** المستويات والمواد: من القاعدة إن رفعها الأدمن، وإلا القيم الافتراضية. */
export function useTaxonomy(stage: Stage | undefined) {
  return useQuery({
    queryKey: keys.taxonomy(stage ?? "primary"),
    enabled: !!stage,
    staleTime: Infinity,
    queryFn: async (): Promise<StageTaxonomy> => {
      try {
        const snap = await getDoc(doc(getFirebase().db, "taxonomy", stage!));
        const data = snap.data() as StageTaxonomy | undefined;
        if (data?.levels?.length && data.subjects?.length) return data;
      } catch {
        // دون إنترنت أو قبل رفع البيانات: القيم الافتراضية تكفي
      }
      return DEFAULT_TAXONOMY[stage!];
    },
  });
}

export function useClasses() {
  const uid = useUid();
  const teacher = useTeacher();
  const yearId = teacher.data?.profile.activeYearId;
  return useQuery({
    queryKey: keys.classes(uid ?? "", yearId ?? ""),
    queryFn: () => listClasses(uid!, yearId!),
    enabled: !!uid && !!yearId,
    staleTime: 60_000,
  });
}

export function useClass(classId: string) {
  const uid = useUid();
  return useQuery({
    queryKey: keys.class(uid ?? "", classId),
    queryFn: () => getClass(uid!, classId),
    enabled: !!uid,
    staleTime: 60_000,
  });
}
