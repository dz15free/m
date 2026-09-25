import { getTranslations } from "next-intl/server";
import { DailyNotebook } from "@/features/logbook/daily-notebook";
import { BackToLogbook } from "../back-link";

export async function generateMetadata() {
  const t = await getTranslations("logbook.daily");
  return { title: t("title") };
}

export default async function DailyNotebookPage({ searchParams }: PageProps<"/app/logbook/daily">) {
  const { date } = await searchParams;
  const t = await getTranslations("logbook.daily");
  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <BackToLogbook />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>
      <DailyNotebook initialDate={typeof date === "string" ? date : undefined} />
    </div>
  );
}
