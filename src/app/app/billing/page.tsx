import { getTranslations } from "next-intl/server";
import { Crown } from "lucide-react";
import { BillingPage } from "@/features/billing/billing-page";

export async function generateMetadata() {
  const t = await getTranslations("billing");
  return { title: t("title") };
}

export default async function Billing() {
  const t = await getTranslations("billing");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <Crown aria-hidden className="size-7 text-brand-700" />
          {t("title")}
        </h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </div>
      <BillingPage />
    </div>
  );
}
