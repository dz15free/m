import { getTranslations } from "next-intl/server";
import { PrepList } from "@/features/logbook/prep-list";
import { BackToLogbook } from "../back-link";

export async function generateMetadata() {
  const t = await getTranslations("logbook.prep");
  return { title: t("title") };
}

export default async function PrepNotebookPage() {
  const t = await getTranslations("logbook.prep");
  return (
    <div className="space-y-4">
      <div>
        <BackToLogbook />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>
      <PrepList />
    </div>
  );
}
