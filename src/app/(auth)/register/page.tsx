import { getTranslations } from "next-intl/server";
import { RegisterForm } from "@/features/auth/auth-forms";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("registerTitle") };
}

export default function Page() {
  return <RegisterForm />;
}
