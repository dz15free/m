"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { TrialOffer } from "./trial-offer";

/** بلوغ حدّ الأقسام: رسالة واضحة + التجربة أو الخطط. (المنع الفعلي في قواعد Firestore.) */
export function ClassLimitNotice({ max }: { max: number }) {
  const t = useTranslations("billing");
  return (
    <div role="alert" className="space-y-3 rounded-card bg-amber-50 p-4 text-amber-950">
      <p className="flex items-center gap-2 font-semibold">
        <Lock aria-hidden className="size-4" />
        {t("limitTitle", { n: max })}
      </p>
      <p className="text-sm">{t("limitBody")}</p>
      <TrialOffer dismissible={false} />
      <Link href="/app/billing" className={buttonClass("secondary")}>{t("seePlans")}</Link>
    </div>
  );
}
