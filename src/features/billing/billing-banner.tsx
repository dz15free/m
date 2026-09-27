"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useBilling } from "./repo";

/** تذكير يُحسب عند فتح التطبيق: أيام التجربة المتبقية، أو قرب انتهاء الاشتراك. */
export function BillingBanner() {
  const t = useTranslations("billing");
  const { ready, effective, access } = useBilling();
  if (!ready) return null;
  const trial = access === "trial";
  const soon = access === "full" && effective.daysLeft !== null && effective.daysLeft <= 3;
  if (!trial && !soon) return null;
  const urgent = soon || (effective.daysLeft ?? 0) <= 2;
  return (
    <div
      role="status"
      className={cn(
        "mb-5 flex flex-wrap items-center gap-3 rounded-card p-4 text-sm print:hidden",
        urgent ? "bg-amber-50 text-amber-950" : "bg-brand-50 text-brand-900",
      )}
    >
      {trial ? <Sparkles aria-hidden className="size-5 shrink-0" /> : <Clock aria-hidden className="size-5 shrink-0" />}
      <p className="min-w-0 flex-1">{trial ? t("trialLeft", { n: effective.daysLeft ?? 0 }) : t("expiring", { n: effective.daysLeft! })}</p>
      <Link href="/app/billing" className="font-semibold underline underline-offset-4">{trial ? t("subscribeNow") : t("renew")}</Link>
    </div>
  );
}
