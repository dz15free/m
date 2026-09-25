"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { useBilling } from "./repo";

/** تذكير يُحسب عند فتح التطبيق (بلا إشعارات مجدولة): قرب الانتهاء أو بعده. */
export function BillingBanner() {
  const t = useTranslations("billing");
  const { ready, effective } = useBilling();
  if (!ready) return null;
  const soon = effective.status !== "free" && effective.daysLeft !== null && effective.daysLeft <= 3;
  if (!soon && !effective.expired) return null;
  return (
    <div role="status" className="mb-5 flex flex-wrap items-center gap-3 rounded-card bg-amber-50 p-4 text-sm text-amber-950 print:hidden">
      <Clock aria-hidden className="size-5 shrink-0" />
      <p className="min-w-0 flex-1">{soon ? t("expiring", { n: effective.daysLeft! }) : t("expired")}</p>
      <Link href="/app/billing" className="font-semibold underline underline-offset-4">{t("renew")}</Link>
    </div>
  );
}
