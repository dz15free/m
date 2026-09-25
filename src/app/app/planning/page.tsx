import { getTranslations } from "next-intl/server";
import { CalendarRange } from "lucide-react";
import { PlanningOverview } from "@/features/planning/planning-overview";

export async function generateMetadata() {
  const t = await getTranslations("planning");
  return { title: t("title") };
}

export default async function PlanningPage() {
  const t = await getTranslations("planning");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <CalendarRange aria-hidden className="size-7 text-brand-700" />
          {t("title")}
        </h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </div>
      <PlanningOverview />
    </div>
  );
}
