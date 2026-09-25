"use client";

import { useRef } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Clock, LoaderCircle, XCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatLongDate } from "@/i18n/dates";
import { useRefreshBilling } from "./repo";
import { getOrder } from "./payments";

/* العودة من Chargily: التأكيد الحقيقي يأتي من الـ webhook إلى الخادم، فنقرأ حالة الطلب
   بفواصل متزايدة (≤ 10 محاولات). صفحة النجاح وحدها لا تمنح شيئًا. */
export function PaymentReturn({ orderId, failed }: { orderId: string; failed: boolean }) {
  const t = useTranslations("billing.return");
  const locale = useLocale() as "ar" | "fr";
  const refresh = useRefreshBilling();
  const attempts = useRef(0);
  const order = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      attempts.current += 1;
      const o = await getOrder(orderId);
      if (o?.status === "paid") await refresh();
      return { o, attempt: attempts.current };
    },
    refetchInterval: (q) => {
      const d = q.state.data;
      if (d?.o && d.o.status !== "pending") return false;
      const n = d?.attempt ?? 0;
      return n >= 10 ? false : Math.min(1000 * 2 ** n, 8000);
    },
  });
  const o = order.data?.o ?? null;
  const tries = order.data?.attempt ?? 0;

  if (o?.status === "paid") {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 aria-hidden className="size-12 text-green-700" />
        <p className="text-xl font-bold">{t("paid")}</p>
        {o.periodEnd && <p className="text-muted">{t("paidUntil", { date: formatLongDate(new Date(o.periodEnd), locale) })}</p>}
        <Link href="/app" className={buttonClass("primary")}>{t("continue")}</Link>
      </Card>
    );
  }
  if (o && (o.status === "failed" || o.status === "mismatch")) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <XCircle aria-hidden className="size-12 text-red-700" />
        <p className="text-xl font-bold">{t("failed")}</p>
        <p className="max-w-sm text-sm text-muted">{t("failedBody")}</p>
        <Link href={`/app/billing/checkout?plan=${o.planId}`} className={buttonClass("primary")}>{t("retry")}</Link>
      </Card>
    );
  }
  const slow = tries >= 10 || (failed && tries >= 3);
  return (
    <Card className="flex flex-col items-center gap-3 py-10 text-center">
      {slow ? <Clock aria-hidden className="size-12 text-amber-700" /> : <LoaderCircle aria-hidden className="size-12 animate-spin text-brand-700" />}
      <p className="text-xl font-bold">{slow ? (failed ? t("failed") : t("checking")) : t("checking")}</p>
      <p className="max-w-sm text-sm text-muted">{slow ? (failed ? t("failedBody") : t("slow")) : t("checkingBody")}</p>
      {slow && <Link href="/app/billing" className={buttonClass("secondary")}>{t("toBilling")}</Link>}
    </Card>
  );
}
