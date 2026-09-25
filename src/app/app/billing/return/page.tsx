import { getTranslations } from "next-intl/server";
import { PaymentReturn } from "@/features/billing/payment-return";

export async function generateMetadata() {
  const t = await getTranslations("billing");
  return { title: t("title") };
}

export default async function ReturnPage({ searchParams }: PageProps<"/app/billing/return">) {
  const { order, failed } = await searchParams;
  return <PaymentReturn orderId={typeof order === "string" ? order.slice(0, 40) : ""} failed={failed === "1"} />;
}
