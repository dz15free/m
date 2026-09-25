import { getTranslations } from "next-intl/server";
import { CalendarClock } from "lucide-react";
import { ScheduleEditor } from "@/features/schedule/schedule-editor";

export async function generateMetadata() {
  const t = await getTranslations("schedule");
  return { title: t("title") };
}

export default async function SchedulePage() {
  const t = await getTranslations("schedule");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <CalendarClock aria-hidden className="size-7 text-brand-700" />
          {t("title")}
        </h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </div>
      <ScheduleEditor />
    </div>
  );
}
