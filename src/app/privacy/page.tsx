import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/features/legal/legal-page";
import { PRIVACY } from "@/features/legal/content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return { title: t("privacy") };
}

export default function Page() {
  return <LegalPage docs={PRIVACY} />;
}
