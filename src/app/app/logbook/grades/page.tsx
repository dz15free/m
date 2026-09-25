import { getTranslations } from "next-intl/server";
import { GradesNotebook } from "@/features/logbook/grades-notebook";
import { BackToLogbook } from "../back-link";

export async function generateMetadata() {
  const t = await getTranslations("logbook.grades");
  return { title: t("title") };
}

export default async function GradesPage() {
  const t = await getTranslations("logbook.grades");
  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <BackToLogbook />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>
      <GradesNotebook />
    </div>
  );
}
