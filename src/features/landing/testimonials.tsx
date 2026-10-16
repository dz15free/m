"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Quote, Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useLandingData, type Testimonial } from "./landing-data";
import { pick, intlLocale } from "@/i18n/pick";
import type { Locale } from "@/i18n/config";

const MIN_FOR_AVERAGE = 3;

function Stars({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} dir="ltr" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-4", i <= Math.round(n) ? "fill-amber-400 text-amber-400" : "text-white/25")} />
      ))}
    </span>
  );
}

function Card({ t: item, tone }: { t: Testimonial; tone: "dark" | "light" }) {
  const t = useTranslations("testimonials");
  const locale = useLocale() as Locale;
  const name = item.firstName || t("teacher");
  const where = [t(`stage.${item.stage === "middle" || item.stage === "secondary" ? item.stage : "primary"}`), pick(item.wilaya, locale)].filter(Boolean).join(" · ");
  const dark = tone === "dark";
  return (
    <figure
      className={cn(
        "flex h-full w-[82vw] max-w-sm shrink-0 snap-start flex-col gap-4 rounded-3xl p-6 sm:w-auto sm:max-w-none",
        dark ? "bg-white/[0.07] text-white ring-1 ring-white/15 backdrop-blur" : "bg-surface shadow-card ring-1 ring-line",
      )}
    >
      <div className="flex items-center justify-between">
        <Stars n={item.rating} />
        <Quote aria-hidden className={cn("size-7", dark ? "text-brand-300/60" : "text-brand-200")} />
      </div>
      <span className="sr-only">{t("stars", { n: item.rating })}</span>
      <blockquote dir="auto" className={cn("flex-1 text-[1.05rem] leading-relaxed", dark ? "text-white/90" : "text-ink")}>
        «{item.comment}»
      </blockquote>
      <figcaption className="flex items-center gap-3">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-lg font-bold", dark ? "bg-brand-400 text-brand-950" : "bg-brand-100 text-brand-800")}>
          {name.slice(0, 1)}
        </span>
        <span className="min-w-0">
          <span className="block font-semibold">{name}</span>
          <span className={cn("block truncate text-sm", dark ? "text-white/65" : "text-muted")}>{where}</span>
        </span>
      </figcaption>
    </figure>
  );
}

/** آراء الأساتذة: قسم كامل في صفحة الهبوط (dark)، أو شريط مختصر في صفحة الاشتراك (compact). لا يظهر شيء إن لم توجد آراء. */
export function Testimonials({ variant = "landing" }: { variant?: "landing" | "compact" }) {
  const t = useTranslations("testimonials");
  const tf = useTranslations("feedback");
  const data = useLandingData();
  const [all, setAll] = useState(false);
  if (!data?.count) return null;

  const showAverage = data.count >= MIN_FOR_AVERAGE;
  const topReasons = Object.entries(data.reasons)
    .filter(([k]) => ["useful", "saveTime", "price"].includes(k))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, n]) => ({ k, pct: Math.round((100 * n) / data.count) }))
    .filter((r) => r.pct >= 20);

  if (variant === "compact") {
    return (
      <section aria-labelledby="tm-title" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="tm-title" className="text-lg font-semibold">{t("compactTitle")}</h2>
          {showAverage && (
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Star aria-hidden className="size-4 fill-amber-400 text-amber-400" />
              {t("average", { avg: data.average.toFixed(1), n: data.count })}
            </p>
          )}
        </div>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
          {data.testimonials.slice(0, 3).map((x) => (
            <Card key={x.id} t={x} tone="light" />
          ))}
        </div>
      </section>
    );
  }

  const shown = all ? data.testimonials : data.testimonials.slice(0, 6);
  return (
    <section aria-labelledby="tm-title" className="relative overflow-hidden bg-brand-950 py-20 text-white">
      <div aria-hidden className="pointer-events-none absolute -top-40 start-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-brand-600/30 blur-3xl rtl:translate-x-1/2" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-brand-300">{t("eyebrow")}</p>
          <h2 id="tm-title" className="mt-2 text-3xl font-bold sm:text-4xl">{t("title")}</h2>
          {showAverage && (
            <div className="mt-6 inline-flex items-center gap-4 rounded-full bg-white/10 px-6 py-3 ring-1 ring-white/15">
              <span className="text-4xl font-bold tabular-nums">{data.average.toFixed(1)}</span>
              <span className="text-start">
                <Stars n={data.average} />
                <span className="block text-sm text-white/70">{t("basedOn", { n: data.count })}</span>
              </span>
            </div>
          )}
          {topReasons.length > 0 && (
            <ul className="mt-5 flex flex-wrap justify-center gap-2 text-sm">
              {topReasons.map((r) => (
                <li key={r.k} className="rounded-full bg-brand-400/15 px-4 py-1.5 text-brand-100 ring-1 ring-brand-300/30">
                  {tf(`reasons.${r.k as "useful"}`)} · <b className="tabular-nums">{r.pct}%</b>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {shown.map((x) => (
            <Card key={x.id} t={x} tone="dark" />
          ))}
        </div>
        {!all && data.testimonials.length > 6 && (
          <div className="mt-6 hidden text-center sm:block">
            <button type="button" onClick={() => setAll(true)} className="rounded-full px-5 py-2.5 font-semibold text-brand-100 ring-1 ring-white/25 hover:bg-white/10">
              {t("more", { n: data.testimonials.length - 6 })}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/** شارة «+2,400 مذكرة جاهزة»: العدد مقرَّب إلى المئات ويُحسب من المناهج المنشورة فيتحدّث وحده؛ لا تظهر قبل وصوله. */
export function MemoBadge({ label, className }: { label: string; className?: string }) {
  const data = useLandingData();
  const locale = useLocale();
  const n = data?.memos ? Math.floor(data.memos / 100) * 100 : 0;
  if (n < 100) return null;
  return (
    <div className={className}>
      <p className="text-2xl font-bold tabular-nums">
        <bdi>+{n.toLocaleString(intlLocale(locale))}</bdi>
      </p>
      <p className="text-xs text-white/75">{label}</p>
    </div>
  );
}
