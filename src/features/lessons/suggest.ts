"use client";

import { useQueries } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";
import { useBilling } from "@/features/billing/repo";
import type { ClassDoc } from "@/features/classes/repo";
import { defaultStart, schoolWeekOf } from "@/features/planning/logic";
import type { Calendar, Slot } from "@/features/schedule/logic";
import type { LessonEntry } from "@/features/logbook/logic";
import { curriculumId, curriculumWeeks, suggestForWeek, type Curriculum, type CurriculumEntry, type LessonSummary } from "./logic";

export type Suggestion = {
  entry: CurriculumEntry;
  curriculum: Curriculum;
  summary: LessonSummary | null;
  schoolWeek: number;
  /** ترتيب الحصة في أسبوع المادة */
  sessionNo: number;
  /** ترتيبها في يومها (الفترة التمهيدية: أسمع وأتحدث ← أشاهد وأقرأ ← أخطط وأكتب) */
  dayIndex: number;
};

const PREP_ACTIVITIES = [
  { name: "أسمع وأتحدث", domain: "فهم المنطوق والتعبير الشفوي" },
  { name: "أشاهد وأقرأ", domain: "فهم المكتوب" },
  { name: "أخطط وأكتب", domain: "التعبير الكتابي" },
];

/** سطر الدفتر من الحصة المقترحة (يبقى قابلًا للتعديل قبل الحفظ). */
export function suggestionToEntry(s: Suggestion, base: LessonEntry): LessonEntry {
  const day = s.entry.k === "day";
  const prep = PREP_ACTIVITIES[s.dayIndex % 3]!;
  const parts = s.summary?.objectiveParts;
  const objectives = day && parts?.length === 3 ? parts[s.dayIndex % 3]!.items : (s.summary?.objectives ?? []);
  const seg = s.curriculum.segments.find((x) => x.n === s.entry.s)?.title ?? "";
  return {
    ...base,
    activity: day ? prep.name : s.entry.a,
    unit: day ? prep.domain : s.entry.d,
    title: s.entry.t,
    objective: objectives.join(" ▪ ").slice(0, 300),
    materials: (s.summary?.materials ?? "").slice(0, 200),
    seq: `${s.entry.s}${seg ? ` — ${seg}` : ""}`.slice(0, 80),
    week: String(day ? Math.ceil(s.entry.u / 5) : s.entry.u),
    session: String(day ? ((s.entry.u - 1) % 5) + 1 : s.sessionNo),
    ref: s.entry.id,
  };
}

async function fetchDoc<T>(path: string): Promise<T | null> {
  try {
    const snap = await getDoc(doc(getFirebase().db, path));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null;
  } catch {
    return null;
  }
}

/** اقتراح حصة من المذكرات الجاهزة لكل حصة من الجدول في الأيام المعروضة.
 *  الأسبوع الدراسي يُحسب من تاريخ انطلاق التوزيع (أو بداية السنة الافتراضية) مع احتساب العطل. */
export function useNotebookSuggestions(args: {
  days: string[];
  rows: { key: string; date: string; slot: Slot }[];
  classes: ClassDoc[];
  calendar: Calendar;
  startYear: number;
}): { map: Map<string, Suggestion>; loading: boolean } {
  const { access } = useBilling();
  const classById = new Map(args.classes.map((c) => [c.id, c]));
  const curIds = [...new Set(args.rows.map((r) => classById.get(r.slot.classId)).filter(Boolean).flatMap((c) => c!.subjectIds.map((s) => curriculumId(c!.level, s))))];
  const curQueries = useQueries({
    queries: curIds.map((id) => ({ queryKey: ["curriculum", id], queryFn: () => fetchDoc<Curriculum>(`curriculum/${id}`), staleTime: 60 * 60_000 })),
  });
  const curricula = new Map<string, Curriculum>();
  curQueries.forEach((q) => q.data && curricula.set(q.data.id, q.data));

  const start = defaultStart(args.startYear);
  const picked = new Map<string, Omit<Suggestion, "summary">>();
  // تجميع حصص كل (قسم، مادة) حسب الأسبوع الدراسي
  const groups = new Map<string, { cur: Curriculum; week: number; refs: { key: string; date: string; start: string }[] }>();
  for (const r of args.rows) {
    const cls = classById.get(r.slot.classId);
    const cur = cls && curricula.get(curriculumId(cls.level, r.slot.subjectId));
    if (!cur) continue;
    const week = schoolWeekOf(r.date, start, args.calendar.schoolDays, args.calendar.holidays);
    const gk = `${r.slot.classId}|${r.slot.subjectId}|${week}`;
    const g = groups.get(gk) ?? { cur, week, refs: [] };
    g.refs.push({ key: r.key, date: r.date, start: r.slot.start });
    groups.set(gk, g);
  }
  for (const g of groups.values()) {
    const weeks = curriculumWeeks(g.cur.entries);
    const map = suggestForWeek(weeks, g.week, g.refs, args.calendar.schoolDays);
    const order = [...g.refs].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
    order.forEach((ref, i) => {
      const entry = map.get(ref.key);
      const dayIndex = order.slice(0, i).filter((o) => o.date === ref.date).length;
      if (entry) picked.set(ref.key, { entry, curriculum: g.cur, schoolWeek: g.week, sessionNo: i + 1, dayIndex });
    });
  }

  const ids = [...new Set([...picked.values()].map((p) => p.entry.id))];
  const sums = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["lessonSummary", id],
      queryFn: () => fetchDoc<LessonSummary>(`lessonSummaries/${id}`),
      enabled: access !== "locked",
      staleTime: 60 * 60_000,
    })),
  });
  const summaryById = new Map<string, LessonSummary>();
  sums.forEach((q, i) => q.data && summaryById.set(ids[i]!, q.data));

  const out = new Map<string, Suggestion>();
  for (const [key, p] of picked) out.set(key, { ...p, summary: summaryById.get(p.entry.id) ?? null });
  const loading = curQueries.some((q) => q.isLoading) || sums.some((q) => q.isLoading && q.fetchStatus !== "idle");
  return { map: out, loading };
}
