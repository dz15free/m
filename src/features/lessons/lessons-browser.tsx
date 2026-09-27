"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, FileText, Hourglass, LoaderCircle, Lock, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { useBilling } from "@/features/billing/repo";
import { useTaxonomy } from "@/features/classes/hooks";
import { levelById, subjectById } from "@/shared/taxonomy/taxonomy";
import { groupCurriculum } from "./logic";
import { useCurriculum, useLessonAccessFor, useMyCurricula } from "./repo";

/** المذكرات الجاهزة لأقسام الأستاذ: مادة ← مقطع ← أسبوع ← حصة. */
export function LessonsBrowser() {
  const t = useTranslations("lessons");
  const locale = useLocale() as "ar" | "fr";
  const tax = useTaxonomy("primary");
  const mine = useMyCurricula();
  const [picked, setPicked] = useState<string | null>(null);

  if (!mine.ready || !tax.data) return <Spinner />;
  if (!mine.list.length) return <Card className="py-10 text-center text-muted">{t("noClasses")}</Card>;
  const available = mine.list.filter((c) => c.available);
  const current = picked ?? available[0]?.id ?? null;
  const label = (c: { level: string; subject: string }) =>
    `${subjectById(tax.data!, c.subject)?.label[locale] ?? c.subject} · ${levelById(tax.data!, c.level)?.short[locale] ?? c.level}`;

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label={t("subjects")} className="-mx-1 flex flex-wrap gap-2">
        {mine.list.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={current === c.id}
            disabled={!c.available}
            onClick={() => setPicked(c.id)}
            className={cn(
              "inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium",
              current === c.id ? "bg-brand-700 text-white" : "bg-surface ring-1 ring-line",
              !c.available && "cursor-default opacity-60",
            )}
          >
            {label(c)}
            {!c.available && <span className="rounded-full bg-amber-100 px-1.5 text-[11px] text-amber-900">{t("soon")}</span>}
          </button>
        ))}
      </div>
      {current ? <CurriculumView id={current} /> : (
        <Card className="flex flex-col items-center gap-2 py-10 text-center text-muted">
          <Hourglass aria-hidden className="size-7 text-brand-700" />
          {t("preparing")}
        </Card>
      )}
    </div>
  );
}

function CurriculumView({ id }: { id: string }) {
  const t = useTranslations("lessons");
  const locale = useLocale() as "ar" | "fr";
  const cur = useCurriculum(id);
  const { access } = useBilling();
  const [open, setOpen] = useState<number | null>(null);
  if (!cur.data) return <Spinner />;
  const groups = groupCurriculum(cur.data);
  const openSeg = open ?? groups[0]?.n;
  return (
    <div className="space-y-3">
      {access === "trial" && (
        <p className="flex items-start gap-2 rounded-card bg-brand-50 p-4 text-sm text-brand-900">
          <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("trialNote")}
        </p>
      )}
      {groups.map((g) => (
        <section key={g.n} className="overflow-hidden rounded-card bg-surface shadow-card">
          <button
            type="button"
            aria-expanded={openSeg === g.n}
            onClick={() => setOpen(openSeg === g.n ? -1 : g.n)}
            className="flex min-h-14 w-full items-center gap-3 px-4 text-start"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 font-bold tabular-nums text-brand-800">{g.n}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{g.title}</span>
              <span className="text-xs text-muted">{t("sessions", { n: g.units.reduce((a, u) => a + u.entries.length, 0) })}</span>
            </span>
            <ChevronDown aria-hidden className={cn("size-5 text-muted transition-transform", openSeg === g.n && "rotate-180")} />
          </button>
          {openSeg === g.n && (
            <div className="space-y-4 border-t border-line px-4 py-3">
              {g.units.map((u) => (
                <div key={u.key}>
                  <h3 className="mb-1 text-sm font-semibold text-brand-800">{u.kind === "day" ? t("day", { n: u.n }) : t("week", { n: u.n })}</h3>
                  <ul className="divide-y divide-line">
                    {u.entries.map((e) => (
                      <li key={e.id}>
                        <EntryRow id={e.id} topic={e.t} activity={e.a} sample={e.sm} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
      <p className="text-xs text-muted">{t("source", { source: cur.data.source[locale] })}</p>
    </div>
  );
}

function EntryRow({ id, topic, activity, sample }: { id: string; topic: string; activity: string; sample: boolean }) {
  const t = useTranslations("lessons");
  const can = useLessonAccessFor(sample);
  const { access } = useBilling();
  return (
    <Link href={`/app/lessons/${id}`} className="flex min-h-12 items-center gap-3 py-2 hover:bg-canvas">
      <FileText aria-hidden className="size-4 shrink-0 text-brand-700" />
      <span className="min-w-0 flex-1">
        <span dir="auto" className="block truncate font-medium">{topic || activity}</span>
        <span className="block truncate text-xs text-muted">{activity}</span>
      </span>
      {!can.body ? (
        <Lock aria-label={t("lockedBody")} className="size-4 shrink-0 text-muted" />
      ) : access === "trial" && sample ? (
        <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-800">{t("sample")}</span>
      ) : null}
    </Link>
  );
}

function Spinner() {
  return (
    <div role="status" className="grid place-items-center py-16">
      <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
    </div>
  );
}
