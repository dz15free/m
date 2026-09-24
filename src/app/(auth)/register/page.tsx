import { getTranslations } from "next-intl/server";
import { AuthSoon } from "../auth-soon";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("registerTitle") };
}

export default function Page() {
  return <AuthSoon titleKey="registerTitle" />;
}
