import { getTranslations } from "next-intl/server";
import { FrontPages } from "@/features/logbook/front-pages";
import { BackToLogbook } from "../back-link";

export async function generateMetadata() {
  const t = await getTranslations("logbook.front");
  return { title: t("title") };
}

export default async function FrontPagesPage() {
  const t = await getTranslations("logbook.front");
  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <BackToLogbook />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>
      <FrontPages />
    </div>
  );
}
