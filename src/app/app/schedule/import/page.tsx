import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ScheduleImport } from "@/features/schedule/schedule-import";

export async function generateMetadata() {
  const t = await getTranslations("scheduleImport");
  return { title: t("title") };
}

export default async function ScheduleImportPage() {
  const t = await getTranslations("scheduleImport");
  const Back = (await getLocale()) === "ar" ? ChevronRight : ChevronLeft;
  return (
    <div className="space-y-5">
      <div>
        <Link href="/app/schedule" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
          <Back aria-hidden className="size-4" />
          {t("back")}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </div>
      <ScheduleImport />
    </div>
  );
}
