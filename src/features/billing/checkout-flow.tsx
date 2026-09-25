"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CreditCard, LoaderCircle, MessageCircle, ShieldCheck } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { openSupport } from "@/features/support/repo";
import { cn } from "@/lib/utils/cn";
import { useBilling } from "./repo";
import { CheckoutError, startCheckout } from "./payments";

type Method = "chargily" | "contact";

/* الاشتراك: الدفع مباشرة بالبطاقة الذهبية/CIB (Chargily، تفعيل تلقائي)،
   أو التواصل مع الإدارة التي تفعّل الاشتراك يدويًا من لوحتها. */
export function CheckoutFlow({ planId }: { planId: string }) {
  const t = useTranslations("billing.checkout");
  const ts = useTranslations("support");
  const locale = useLocale() as "ar" | "fr";
  const { ready, plans } = useBilling();
  const [method, setMethod] = useState<Method>("chargily");
  const [cardState, setCardState] = useState<"idle" | "busy" | CheckoutError["reason"]>("idle");

  if (!ready) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  const plan = plans.find((p) => p.id === planId && p.active && p.priceDzd > 0);
  if (!plan) return <Card className="py-10 text-center text-muted">{t("unavailable")}</Card>;
  const cur = locale === "ar" ? "دج" : "DA";
  const price = `${plan.priceDzd.toLocaleString(locale === "ar" ? "ar-DZ-u-nu-latn" : "fr-DZ")} ${cur}`;

  async function payByCard() {
    setCardState("busy");
    try {
      window.location.href = await startCheckout(plan!.id, locale);
    } catch (e) {
      setCardState(e instanceof CheckoutError ? e.reason : "error");
    }
  }

  const options: { id: Method; icon: typeof CreditCard }[] = [
    { id: "chargily", icon: CreditCard },
    { id: "contact", icon: MessageCircle },
  ];

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-bold">{plan.name[locale]}</p>
          <p className="text-sm text-muted">{plan.description?.[locale]}</p>
        </div>
        <p className="shrink-0 text-2xl font-bold tabular-nums">{price}</p>
      </Card>

      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">{t("method")}</legend>
        {options.map(({ id, icon: Icon }) => (
          <label
            key={id}
            className={cn("flex cursor-pointer items-start gap-3 rounded-card bg-surface p-4 shadow-card ring-2", method === id ? "ring-brand-600" : "ring-transparent")}
          >
            <input type="radio" name="method" checked={method === id} onChange={() => setMethod(id)} className="mt-1 size-5 accent-brand-700" />
            <Icon aria-hidden className="mt-0.5 size-6 shrink-0 text-brand-700" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{t(`methods.${id}.title`)}</span>
              <span className="block text-sm text-muted">{t(`methods.${id}.body`)}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {method === "chargily" ? (
        <Card className="space-y-3">
          <button type="button" onClick={payByCard} disabled={cardState === "busy"} className={buttonClass("primary", "lg", "w-full")}>
            {cardState === "busy" ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : <CreditCard aria-hidden className="size-5" />}
            {cardState === "busy" ? t("redirecting") : `${t("payCard")} · ${price}`}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
            <ShieldCheck aria-hidden className="size-4" />
            {t("secure")}
          </p>
          <p className="text-center text-xs text-muted">
            {t.rich("agree", { terms: (c) => <Link href="/terms" target="_blank" className="underline">{c}</Link> })}
          </p>
          {cardState !== "idle" && cardState !== "busy" && (
            <p role="alert" className="text-sm text-red-700">
              {cardState === "tooMany" ? t("tooMany") : cardState === "unavailable" ? t("unavailable") : cardState === "notConfigured" ? t("notConfigured") : t("cardError")}
            </p>
          )}
        </Card>
      ) : (
        <Card className="space-y-3">
          <p className="text-sm">{t("contactBody", { price })}</p>
          <button type="button" onClick={() => openSupport(ts("subscribeText"))} className={buttonClass("primary", "lg", "w-full")}>
            <MessageCircle aria-hidden className="size-5" />
            {t("contactCta")}
          </button>
        </Card>
      )}
    </div>
  );
}
