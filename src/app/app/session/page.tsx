import { getTranslations } from "next-intl/server";
import { SessionLauncher } from "@/features/schedule/session-launcher";

export async function generateMetadata() {
  const t = await getTranslations("session");
  return { title: t("title") };
}

export default function SessionPage() {
  return <SessionLauncher />;
}
