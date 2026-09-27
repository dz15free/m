"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";
import { Check, LoaderCircle, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatLongDate } from "@/i18n/dates";
import { cn } from "@/lib/utils/cn";
import { useBilling } from "./repo";
import { FeedbackForm } from "./feedback-form";

export function BillingPage() {
  const t = useTranslations("billing");
  const locale = useLocale() as "ar" | "fr";
  const { ready, effective, access, plans } = useBilling();

  if (!ready) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  const current = plans.find((p) => p.id === effective.planId);

  return (
    <div className="space-y-5">
      <Card className="space-y-2">
        <p className="text-sm text-muted">{t("current")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xl font-bold">{(access !== "locked" && current?.name[locale]) || t(`status.${effective.status}`)}</p>
          {access !== "locked" && (
            <span className="rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-semibold text-accent-700">{t(`status.${effective.status}`)}</span>
          )}
        </div>
        {effective.endsAt && (
          <p className="text-sm">
            {t("endsOn", { date: formatLongDate(new Date(effective.endsAt), locale) })} · {t("daysLeft", { n: effective.daysLeft ?? 0 })}
          </p>
        )}
        <p className="pt-1 text-sm text-muted">{t(`accessNote.${access}`)}</p>
      </Card>

      <section aria-labelledby="plans" className="space-y-3">
        <h2 id="plans" className="text-lg font-semibold">{t("plans")}</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {plans
            .filter((p) => p.active && p.priceDzd > 0)
            .map((p) => (
              <li key={p.id}>
                <Card className={cn("flex h-full flex-col gap-3", access === "full" && p.id === effective.planId && "ring-2 ring-brand-300")}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-lg font-bold">{p.name[locale]}</p>
                    {access === "full" && p.id === effective.planId && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800">{t("yourPlan")}</span>}
                  </div>
                  <p className="text-2xl font-bold tabular-nums">
                    {t("perPeriod", { price: p.priceDzd.toLocaleString(locale === "ar" ? "ar-DZ-u-nu-latn" : "fr-DZ"), days: p.durationDays })}
                  </p>
                  <p className="text-sm text-muted">{p.description?.[locale]}</p>
                  <ul className="space-y-1 text-sm">
                    {(["notebook", "lessons", "tools"] as const).map((k) => (
                      <li key={k} className="flex items-center gap-2"><Check aria-hidden className="size-4 shrink-0 text-green-700" />{t(`includes.${k}`)}</li>
                    ))}
                    <li className="flex items-center gap-2"><Check aria-hidden className="size-4 shrink-0 text-green-700" />{t("classesLimit", { n: p.limits.maxClasses })}</li>
                  </ul>
                  <Link href={`/app/billing/checkout?plan=${p.id}`} className={buttonClass("primary", "md", "mt-auto")}>
                    {access === "full" && effective.planId === p.id ? t("renew") : t("subscribe")}
                  </Link>
                </Card>
              </li>
            ))}
        </ul>
      </section>

      <p className="flex items-start gap-2 rounded-card bg-surface p-4 text-sm text-muted shadow-card">
        <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-700" />
        {t("guarantee")}
      </p>

      <FeedbackForm context={access === "trial" ? "trial" : access === "locked" ? "trialEnd" : "general"} />
    </div>
  );
}
