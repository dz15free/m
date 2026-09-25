"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Check, LoaderCircle, Printer, Trash2 } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, SelectField } from "@/components/ui/field";
import { useClasses, useTaxonomy, useTeacher, useUid } from "@/features/classes/hooks";
import { formatHijri, formatLongDate } from "@/i18n/dates";
import { levelById, subjectById, type StageTaxonomy } from "@/shared/taxonomy/taxonomy";
import { cleanPrep, emptyPrep, PREP_BODY_FIELDS, PREP_HEAD_FIELDS, PREP_MAX, PREP_PHASES, type PrepEntry } from "./logic";
import { getPrep, removePrep, savePrep } from "./repo";

const textarea =
  "block w-full resize-y rounded-xl border border-line bg-surface px-3 py-2.5 outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100";

export function PrepEditor({ prepId }: { prepId: string }) {
  const t = useTranslations("logbook.prep");
  const uid = useUid();
  const teacher = useTeacher();
  const classes = useClasses();
  const tax = useTaxonomy(teacher.data?.profile.stage);
  const isNew = prepId === "new";
  const prep = useQuery({ queryKey: ["prep", uid ?? "", prepId], queryFn: () => getPrep(uid!, prepId), enabled: !!uid && !isNew });

  if (!teacher.data || !classes.data || !tax.data || (!isNew && prep.data === undefined)) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  if (!isNew && !prep.data) return <Card className="py-12 text-center text-muted">{t("notFound")}</Card>;

  const active = classes.data.filter((c) => !c.archived);
  const initial: PrepEntry = prep.data
    ? (({ id: _id, ...rest }) => (void _id, rest))(prep.data)
    : emptyPrep(active[0]?.subjectIds[0] ?? "", active[0]?.level ?? "");
  // المفتاح يعيد تهيئة النموذج عند الانتقال من «جديدة» إلى المذكرة المحفوظة
  return (
    <PrepForm
      key={prepId}
      prepId={isNew ? undefined : prepId}
      initial={initial}
      taxonomy={tax.data}
      subjectIds={[...new Set(active.flatMap((c) => c.subjectIds))]}
      levelIds={[...new Set(active.map((c) => c.level))]}
    />
  );
}

function PrepForm({
  prepId,
  initial,
  taxonomy,
  subjectIds,
  levelIds,
}: {
  prepId?: string;
  initial: PrepEntry;
  taxonomy: StageTaxonomy;
  subjectIds: string[];
  levelIds: string[];
}) {
  const t = useTranslations("logbook.prep");
  const locale = useLocale() as "ar" | "fr";
  const router = useRouter();
  const queryClient = useQueryClient();
  const uid = useUid();
  const teacher = useTeacher().data;
  const [draft, setDraft] = useState<PrepEntry>(initial);
  // بعد إنشاء مذكرة ننتقل إلى رابطها الدائم مع ?saved=1 لإبقاء تأكيد الحفظ ظاهرًا
  const justCreated = useSearchParams().get("saved") === "1";
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(justCreated ? "saved" : "idle");

  const subjects = (subjectIds.length ? subjectIds : taxonomy.subjects.map((s) => s.id)).map((id) => ({
    id,
    label: subjectById(taxonomy, id)?.label[locale] ?? id,
  }));
  const levels = (levelIds.length ? levelIds : taxonomy.levels.map((l) => l.id)).map((id) => ({
    id,
    label: levelById(taxonomy, id)?.label[locale] ?? id,
  }));
  const set = <K extends keyof PrepEntry>(k: K, v: PrepEntry[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setState("idle");
  };
  const setPhase = (ph: (typeof PREP_PHASES)[number], k: "situation" | "assessment", v: string) => {
    setDraft((d) => ({ ...d, phases: { ...d.phases, [ph]: { ...d.phases[ph], [k]: v } } }));
    setState("idle");
  };

  async function save() {
    if (!uid) return;
    setState("saving");
    try {
      const id = await savePrep(uid, draft, prepId);
      await queryClient.invalidateQueries({ queryKey: ["preps", uid] });
      queryClient.setQueryData(["prep", uid, id], { id, ...cleanPrep(draft) });
      setState("saved");
      if (!prepId) router.replace(`/app/logbook/prep/${id}?saved=1`);
    } catch {
      setState("error");
    }
  }

  async function remove() {
    if (!uid || !prepId || !window.confirm(t("deleteConfirm"))) return;
    await removePrep(uid, prepId);
    await queryClient.invalidateQueries({ queryKey: ["preps", uid] });
    router.replace("/app/logbook/prep");
  }

  const teacherName = teacher ? `${teacher.profile.lastName} ${teacher.profile.firstName}` : "";

  return (
    <>
      <div className="space-y-4 pb-4 print:hidden">
        <Card className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectField label={t("subject")} value={draft.subjectId} onChange={(e) => set("subjectId", e.target.value)}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </SelectField>
            <SelectField label={t("grade")} value={draft.gradeId} onChange={(e) => set("gradeId", e.target.value)}>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </SelectField>
            <Field label={t("date")} type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PREP_HEAD_FIELDS.map((f) => (
              <Field
                key={f}
                label={t(`fields.${f}`)}
                dir="auto"
                maxLength={PREP_MAX[f]}
                value={draft[f]}
                onChange={(e) => set(f, e.target.value)}
                className={f === "content" || f === "activity" || f === "domain" ? "col-span-2 sm:col-span-1" : undefined}
              />
            ))}
          </div>
          {PREP_BODY_FIELDS.map((f) => (
            <label key={f} className="block space-y-1.5">
              <span className="block text-sm font-medium">{t(`fields.${f}`)}</span>
              <textarea value={draft[f]} onChange={(e) => set(f, e.target.value)} maxLength={PREP_MAX[f]} rows={2} dir="auto" className={textarea} />
            </label>
          ))}
        </Card>

        <h2 className="text-lg font-semibold">{t("phasesTitle")}</h2>
        {PREP_PHASES.map((ph) => (
          <Card key={ph} className="space-y-3">
            <h3 className="font-semibold text-brand-800">{t(`phases.${ph}`)}</h3>
            <label className="block space-y-1.5">
              <span className="block text-sm font-medium">{t("situation")}</span>
              <textarea
                value={draft.phases[ph].situation}
                onChange={(e) => setPhase(ph, "situation", e.target.value)}
                maxLength={PREP_MAX.situation}
                rows={ph === "build" ? 8 : 4}
                dir="auto"
                placeholder={t(`placeholders.${ph}`)}
                className={textarea}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="block text-sm font-medium">{t("assessment")}</span>
              <textarea
                value={draft.phases[ph].assessment}
                onChange={(e) => setPhase(ph, "assessment", e.target.value)}
                maxLength={PREP_MAX.assessment}
                rows={2}
                dir="auto"
                placeholder={t("placeholders.assessment")}
                className={textarea}
              />
            </label>
          </Card>
        ))}

        {state === "error" && <p role="alert" className="text-sm text-red-700">{t("error")}</p>}
        {/* شريط الحفظ ثابت فوق الشريط السفلي على الهاتف */}
        <div data-sticky-bar className="sticky bottom-24 z-10 flex flex-wrap items-center gap-2 rounded-card bg-surface/95 p-3 shadow-float backdrop-blur lg:bottom-4">
          <button type="button" onClick={save} disabled={state === "saving"} className={buttonClass("primary")}>
            {state === "saving" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : state === "saved" ? <Check aria-hidden className="size-4" /> : null}
            {state === "saved" ? t("saved") : t("save")}
          </button>
          <button type="button" onClick={() => window.print()} className={buttonClass("secondary")}>
            <Printer aria-hidden className="size-4" />
            {t("print")}
          </button>
          {prepId && (
            <button type="button" onClick={remove} className={buttonClass("ghost", "md", "ms-auto text-red-700")}>
              <Trash2 aria-hidden className="size-4" />
              {t("delete")}
            </button>
          )}
        </div>
      </div>

      {/* ── الطباعة: المذكرة بنموذج دفتر التحضير (A4 عمودي) ── */}
      <div className="hidden text-[10.5pt] print:block">
        <style>{"@page { size: A4 portrait; margin: 11mm; }"}</style>
        <div className="mb-2 flex justify-between gap-4">
          <p><b>{t("date")}:</b> {draft.date ? formatLongDate(new Date(`${draft.date}T12:00:00`), locale) : "........................"}</p>
          {locale === "ar" && <p><b>{t("hijri")}:</b> {draft.date ? formatHijri(draft.date) : "........................"}</p>}
        </div>
        <table className="mb-3 w-full border-collapse">
          <tbody>
            {(
              [
                ["domain", "teacher", "sequence"],
                ["activity", null, "week"],
                ["content", null, "session"],
              ] as const
            ).map(([a, mid, b]) => (
              <tr key={a}>
                <th className="w-[14%] border border-ink bg-canvas px-2 py-1 text-start">{t(`fields.${a}`)}</th>
                <td className="border border-ink px-2 py-1" colSpan={mid ? 1 : 3}><bdi>{draft[a]}</bdi></td>
                {mid && (
                  <>
                    <th className="w-[12%] border border-ink bg-canvas px-2 py-1 text-start">{t("teacher")}</th>
                    <td className="border border-ink px-2 py-1">{teacherName}</td>
                  </>
                )}
                <th className="w-[12%] border border-ink bg-canvas px-2 py-1 text-start">{t(`fields.${b}`)}</th>
                <td className="w-[12%] border border-ink px-2 py-1"><bdi>{draft[b]}</bdi></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mb-3 space-y-1 border border-ink px-3 py-2">
          <p className="text-[9pt] text-muted">
            {[subjectById(taxonomy, draft.subjectId)?.label[locale], levelById(taxonomy, draft.gradeId)?.label[locale]].filter(Boolean).join(" — ")}
          </p>
          {PREP_BODY_FIELDS.map((f) => (
            <p key={f} className="whitespace-pre-line"><b>{t(`fields.${f}`)}:</b> <bdi>{draft[f]}</bdi></p>
          ))}
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-canvas">
              <th className="w-[16%] border border-ink px-2 py-1">{t("stages")}</th>
              <th className="border border-ink px-2 py-1">{t("situation")}</th>
              <th className="w-[22%] border border-ink px-2 py-1">{t("assessment")}</th>
            </tr>
          </thead>
          <tbody>
            {PREP_PHASES.map((ph) => (
              <tr key={ph} className="align-top">
                <th className="border border-ink px-2 py-2 align-middle font-semibold">{t(`phases.${ph}`)}</th>
                <td className={`border border-ink px-2 py-2 whitespace-pre-line ${ph === "build" ? "h-64" : "h-28"}`} dir="auto">{draft.phases[ph].situation}</td>
                <td className="border border-ink px-2 py-2 whitespace-pre-line" dir="auto">{draft.phases[ph].assessment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
