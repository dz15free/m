import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CheckoutFlow } from "@/features/billing/checkout-flow";

export async function generateMetadata() {
  const t = await getTranslations("billing");
  return { title: t("title") };
}

export default async function CheckoutPage({ searchParams }: PageProps<"/app/billing/checkout">) {
  const { plan } = await searchParams;
  const t = await getTranslations("billing.checkout");
  const Back = (await getLocale()) === "ar" ? ChevronRight : ChevronLeft;
  return (
    <div className="space-y-3">
      <Link href="/app/billing" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-700">
        <Back aria-hidden className="size-4" />
        {t("back")}
      </Link>
      <CheckoutFlow planId={typeof plan === "string" ? plan : "premium"} />
    </div>
  );
}
