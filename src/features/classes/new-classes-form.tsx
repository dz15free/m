"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Check, LoaderCircle, Minus, Plus } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { subjectsForLevel, type StageTaxonomy } from "@/shared/taxonomy/taxonomy";
import { cn } from "@/lib/utils/cn";
import { keys, useClasses, useTaxonomy, useTeacher, useUid } from "./hooks";
import { classDisplayName, nextSections } from "./naming";
import { ClassLimitError, createClasses, type ClassDoc, type ClassDraft } from "./repo";
import { useBilling } from "@/features/billing/repo";
import { ClassLimitNotice } from "@/features/billing/class-limit";
import { SubjectChips } from "./subject-chips";

const MAX_GROUPS_PER_LEVEL = 15;
const MAX_TOTAL = 40;

export function NewClassesForm() {
  const teacher = useTeacher();
  const tax = useTaxonomy(teacher.data?.profile.stage);
  const classes = useClasses();

  if (!teacher.data || !tax.data || !classes.data) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  return (
    <Form
      taxonomy={tax.data}
      existing={classes.data}
      generalist={teacher.data.profile.presetType === "primaryGeneralist"}
      ctx={{
        yearId: teacher.data.profile.activeYearId,
        schoolId: teacher.data.profile.primarySchoolId,
        stage: teacher.data.profile.stage,
      }}
    />
  );
}

function Form({
  taxonomy,
  existing,
  generalist,
  ctx,
}: {
  taxonomy: StageTaxonomy;
  existing: ClassDoc[];
  generalist: boolean;
  ctx: Parameters<typeof createClasses>[1];
}) {
  const t = useTranslations("classes.new");
  const tb = useTranslations("billing");
  const locale = useLocale() as "ar" | "fr";
  const router = useRouter();
  const uid = useUid();
  const queryClient = useQueryClient();

  /** عدد الأفواج لكل مستوى (0 = غير مختار) */
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [subjects, setSubjects] = useState<Set<string>>(new Set());
  const [error, setError] = useState<"pickLevel" | "pickSubject" | "error" | "limit" | null>(null);
  const [creating, setCreating] = useState(false);
  const billing = useBilling();
  const max = billing.effective.limits.maxClasses;

  const levels = [...taxonomy.levels].sort((a, b) => a.order - b.order);
  const chosen = levels.filter((l) => (counts[l.id] ?? 0) > 0);

  // المواد المتاحة = مواد المستويات المختارة، بترتيب القائمة المرجعية
  const available = taxonomy.subjects.filter((s) => chosen.some((l) => s.levels.includes(l.id)));

  const drafts: ClassDraft[] = chosen.flatMap((l) =>
    nextSections(existing, l.id, counts[l.id] ?? 0).map((section) => ({
      level: l.id,
      section,
      subjectIds: subjectsForLevel(taxonomy, l.id)
        .map((s) => s.id)
        .filter((id) => subjects.has(id)),
    })),
  );
  const total = drafts.length;
  // حدّ الخطة (للعرض؛ القواعد تفرضه فعلًا)
  const overLimit = billing.ready && existing.length + total > max;

  function toggleLevel(levelId: string) {
    setError(null);
    const on = (counts[levelId] ?? 0) > 0;
    setCounts({ ...counts, [levelId]: on ? 0 : 1 });
    // معلّم القسم: نختار له كل مواد المستوى تلقائيًا
    if (!on && generalist) {
      setSubjects(new Set([...subjects, ...subjectsForLevel(taxonomy, levelId).map((s) => s.id)]));
    }
  }

  function step(levelId: string, delta: number) {
    const next = Math.min(MAX_GROUPS_PER_LEVEL, Math.max(1, (counts[levelId] ?? 1) + delta));
    if (total - (counts[levelId] ?? 0) + next > MAX_TOTAL) return;
    setCounts({ ...counts, [levelId]: next });
  }

  function toggleSubject(id: string) {
    setError(null);
    const next = new Set(subjects);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSubjects(next);
  }

  async function create() {
    if (!uid) return;
    if (!chosen.length) return setError("pickLevel");
    if (drafts.some((d) => d.subjectIds.length === 0)) return setError("pickSubject");
    setCreating(true);
    try {
      await createClasses(uid, ctx, drafts);
      await queryClient.invalidateQueries({ queryKey: keys.classes(uid, ctx.yearId) });
      router.push("/app/classes");
    } catch (e) {
      setError(e instanceof ClassLimitError ? "limit" : "error");
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6 pb-4">
      <Card className="space-y-4">
        <h2 className="font-semibold">{t("levels")}</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {levels.map((l) => {
            const count = counts[l.id] ?? 0;
            const on = count > 0;
            return (
              <li
                key={l.id}
                className={cn(
                  "flex min-h-16 items-center gap-3 rounded-2xl p-3 ring-2 transition-colors",
                  on ? "bg-brand-50 ring-brand-600" : "bg-surface ring-line",
                )}
              >
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleLevel(l.id)}
                  className="flex flex-1 items-center gap-3 text-start"
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-lg ring-2",
                      on ? "bg-brand-700 text-white ring-brand-700" : "ring-line",
                    )}
                  >
                    {on && <Check aria-hidden className="size-4" />}
                  </span>
                  <span className="font-medium">{l.label[locale]}</span>
                </button>
                {on && (
                  <div className="flex items-center gap-1" role="group" aria-label={`${t("groups")} — ${l.label[locale]}`}>
                    <button
                      type="button"
                      onClick={() => step(l.id, -1)}
                      aria-label={t("decrease")}
                      className="grid size-10 place-items-center rounded-full bg-surface ring-1 ring-line disabled:opacity-40"
                      disabled={count <= 1}
                    >
                      <Minus aria-hidden className="size-4" />
                    </button>
                    <span className="w-7 text-center text-lg font-bold tabular-nums" aria-live="polite">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => step(l.id, 1)}
                      aria-label={t("increase")}
                      className="grid size-10 place-items-center rounded-full bg-surface ring-1 ring-line disabled:opacity-40"
                      disabled={count >= MAX_GROUPS_PER_LEVEL}
                    >
                      <Plus aria-hidden className="size-4" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {chosen.length > 0 && (
        <Card className="space-y-3">
          <h2 className="font-semibold">{t("subjects")}</h2>
          <p className="text-sm text-muted">{generalist ? t("subjectsHintGeneralist") : t("subjectsHintSubject")}</p>
          <SubjectChips subjects={available} selected={subjects} onToggle={toggleSubject} />
        </Card>
      )}

      {total > 0 && (
        <Card className="space-y-3">
          <h2 className="font-semibold">{t("preview")}</h2>
          <ul className="flex flex-wrap gap-2" dir="ltr">
            {drafts.map((d) => (
              <li
                key={`${d.level}-${d.section}`}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-sm font-bold ring-1",
                  d.subjectIds.length ? "bg-brand-50 text-brand-900 ring-brand-200" : "bg-red-50 text-red-800 ring-red-200",
                )}
              >
                {classDisplayName(d.level, d.section)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {billing.ready && <p className="text-sm text-muted">{tb("slots", { used: existing.length, max })}</p>}
      {(overLimit || error === "limit") && <ClassLimitNotice max={max} />}
      {error && error !== "limit" && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {t(error)}
        </p>
      )}

      <div data-sticky-bar className="sticky bottom-24 z-10 lg:bottom-6">
        <button
          type="button"
          onClick={create}
          disabled={creating || total === 0 || overLimit}
          className={buttonClass("primary", "lg", "w-full shadow-lg sm:w-auto")}
        >
          {creating ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : <Plus aria-hidden className="size-5" />}
          {creating ? t("creating") : t("create", { count: Math.max(total, 1) })}
        </button>
      </div>
    </div>
  );
}
