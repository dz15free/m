"use client";

import Link from "next/link";
import { PrintButtons } from "@/components/ui/print-actions";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, LoaderCircle, Lock, Sparkles } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DOC, docLangOfSubject } from "@/i18n/doc-lang";
import { useCurriculum, useLesson, useLessonAccessFor, useLessonPages } from "./repo";

/** مذكرة جاهزة: الرأس والأهداف (التجربة) والسير كاملًا (الاشتراك أو النماذج). قابلة للطباعة.
    مذكرات الفرنسية والإنجليزية: عناوين حقولها بلغة المادة ومن اليسار. */
export function LessonView({ id }: { id: string }) {
  const t = useTranslations("lessons");
  const locale = useLocale() as "ar" | "fr";
  const curId = id.replace(/_\d+$/, "");
  const cur = useCurriculum(curId);
  const entry = cur.data?.entries.find((e) => e.id === id);
  const can = useLessonAccessFor(!!entry?.sm);
  const { summary, body } = useLesson(id, { summary: can.summary && !!entry, body: can.body && !!entry?.b });
  const pages = useLessonPages(body.data?.pages ?? []);

  if (cur.isLoading || (can.summary && summary.isLoading)) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  if (!entry) return <Card className="py-10 text-center text-muted">{t("notFound")}</Card>;
  const s = summary.data;
  const segTitle = cur.data?.segments.find((x) => x.n === entry.s)?.title ?? "";
  const lang = docLangOfSubject(cur.data?.subject);
  const D = lang ? DOC[lang] : null;
  const label = (k: "segment" | "unit" | "activity" | "domain" | "materials" | "objectives" | "process" | "original") => D?.[k] ?? t(k);
  const unit = entry.k === "day" ? (D?.day(entry.u) ?? t("day", { n: entry.u })) : (D?.week(entry.u) ?? t("week", { n: entry.u }));
  const doc = lang ? { dir: "ltr" as const, lang } : {};

  return (
    <article className="space-y-4 print:space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/app/lessons" className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-brand-800">
          <ArrowRight aria-hidden className="size-4 ltr:rotate-180" />
          {t("back")}
        </Link>
        {can.summary && (
          <PrintButtons title={() => document.querySelector("article h1, article h2")?.textContent?.trim() || t("print")} />
        )}
      </div>

      <Card {...doc} className="space-y-3 print:shadow-none print:ring-1 print:ring-black/30">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <Row label={label("segment")} value={`${entry.s} — ${segTitle}`} />
          <Row label={label("unit")} value={unit} />
          <Row label={label("activity")} value={s?.activity ?? entry.a} />
          <Row label={label("domain")} value={s?.domain ?? entry.d} />
        </dl>
        <h1 dir="auto" className="text-xl font-bold leading-snug">{entry.t || entry.a}</h1>
        {s?.materials && <p className="text-sm"><b>{label("materials")}:</b> {s.materials}</p>}
      </Card>

      {can.summary && s ? (
        <Card {...doc} className="space-y-2 print:shadow-none print:ring-1 print:ring-black/30">
          <h2 className="font-bold">{label("objectives")}</h2>
          <ul className="list-disc space-y-1 ps-5 leading-relaxed">
            {s.objectives.map((o) => <li key={o}>{o}</li>)}
          </ul>
        </Card>
      ) : null}

      {can.body && body.data ? (
        <>
          {body.data.body && (
            <Card {...doc} className="space-y-2 print:shadow-none print:ring-1 print:ring-black/30">
              <h2 className="font-bold">{label("process")}</h2>
              <div dir="auto" className="whitespace-pre-line leading-loose">{body.data.body}</div>
            </Card>
          )}
          {!!body.data.pages?.length && (
            <section {...doc} className="space-y-3">
              <h2 className="font-bold print:hidden">{label("original")}</h2>
              {pages.map((q, i) =>
                q.data ? (
                  // eslint-disable-next-line @next/next/no-img-element -- صفحة الوثيقة الأصلية (محمية بالقواعد)
                  <img
                    key={i}
                    src={`data:image/jpeg;base64,${q.data.img}`}
                    alt={D?.page(q.data.page) ?? t("pageAlt", { n: q.data.page })}
                    className="w-full rounded-card bg-white shadow-card print:break-after-page print:shadow-none"
                  />
                ) : (
                  <div key={i} className="grid aspect-[1/1.41] place-items-center rounded-card bg-surface shadow-card">
                    <LoaderCircle aria-hidden className="size-7 animate-spin text-brand-700" />
                  </div>
                ),
              )}
            </section>
          )}
        </>
      ) : entry.b && !can.body ? (
        <Card className="flex flex-col items-center gap-3 border-2 border-accent-300 py-8 text-center print:hidden">
          <Lock aria-hidden className="size-7 text-accent-700" />
          <p className="font-semibold">{t("lockedTitle")}</p>
          <p className="max-w-sm text-sm text-muted">{t("lockedBody")}</p>
          <Link href="/app/billing" className={buttonClass("primary")}>
            <Sparkles aria-hidden className="size-4" />
            {t("subscribe")}
          </Link>
        </Card>
      ) : null}

      <p className="text-xs text-muted">{t("source", { source: cur.data!.source[locale] })}</p>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 font-semibold text-brand-800">{label}:</dt>
      <dd dir="auto">{value}</dd>
    </div>
  );
}
