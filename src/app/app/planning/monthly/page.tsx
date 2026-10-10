import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MonthlySheet } from "@/features/planning/monthly-sheet";

export async function generateMetadata() {
  const t = await getTranslations("planning.monthlyPlan");
  return { title: t("title") };
}

export default async function MonthlyPlanningPage({ searchParams }: PageProps<"/app/planning/monthly">) {
  const { m, c } = await searchParams;
  const t = await getTranslations("planning");
  const Back = (await getLocale()) === "ar" ? ChevronRight : ChevronLeft;
  return (
    <div className="space-y-3">
      <div className="print:hidden">
        <Link href="/app/planning" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-700">
          <Back aria-hidden className="size-4" />
          {t("back")}
        </Link>
        <h1 className="text-2xl font-bold">{t("monthlyPlan.title")}</h1>
      </div>
      <MonthlySheet month={typeof m === "string" ? m : undefined} classId={typeof c === "string" ? c : undefined} />
    </div>
  );
}
