import { getTranslations } from "next-intl/server";
import { TrainingNotebook } from "@/features/logbook/training-notebook";
import { BackToLogbook } from "../back-link";

export async function generateMetadata() {
  const t = await getTranslations("logbook.training");
  return { title: t("title") };
}

export default async function TrainingNotebookPage() {
  const t = await getTranslations("logbook.training");
  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <BackToLogbook />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>
      <TrainingNotebook />
    </div>
  );
}
