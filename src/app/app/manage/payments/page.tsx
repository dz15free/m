import { getTranslations } from "next-intl/server";
import { PaymentsReview } from "@/features/billing/payments-review";

export async function generateMetadata() {
  const t = await getTranslations("paymentsAdmin");
  return { title: t("title") };
}

export default async function PaymentsAdminPage() {
  const t = await getTranslations("paymentsAdmin");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <PaymentsReview />
    </div>
  );
}
