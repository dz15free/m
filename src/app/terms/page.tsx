import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/features/legal/legal-page";
import { TERMS } from "@/features/legal/content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return { title: t("terms") };
}

export default function Page() {
  return <LegalPage docs={TERMS} />;
}
