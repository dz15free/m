import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CalendarClock, FileUp } from "lucide-react";
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
      <Link
        href="/app/schedule/import"
        className="flex items-center gap-3 rounded-card bg-brand-50 p-4 text-brand-900 ring-1 ring-brand-100 transition-colors hover:bg-brand-100"
      >
        <FileUp aria-hidden className="size-6 shrink-0 text-brand-700" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{t("importTitle")}</span>
          <span className="block text-sm text-brand-800/80">{t("importHint")}</span>
        </span>
      </Link>
      <ScheduleEditor />
    </div>
  );
}
