import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";

export async function BackToLogbook() {
  const t = await getTranslations("logbook");
  const Back = (await getLocale()) === "ar" ? ChevronRight : ChevronLeft;
  return (
    <Link href="/app/logbook" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-700">
      <Back aria-hidden className="size-4" />
      {t("back")}
    </Link>
  );
}
