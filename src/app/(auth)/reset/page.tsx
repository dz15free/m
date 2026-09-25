import { getTranslations } from "next-intl/server";
import { ResetForm } from "@/features/auth/auth-forms";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("resetTitle") };
}

export default function Page() {
  return <ResetForm />;
}
