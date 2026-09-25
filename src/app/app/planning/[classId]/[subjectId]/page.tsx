import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProgressionEditor } from "@/features/planning/progression-editor";
import { ProgressionTitle } from "@/features/planning/progression-title";

export async function generateMetadata() {
  const t = await getTranslations("planning");
  return { title: t("title") };
}

export default async function ProgressionPage({ params }: PageProps<"/app/planning/[classId]/[subjectId]">) {
  const { classId, subjectId } = await params;
  const t = await getTranslations("planning");
  const Back = (await getLocale()) === "ar" ? ChevronRight : ChevronLeft;
  return (
    <div className="space-y-3">
      <div className="print:hidden">
        <Link href="/app/planning" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-700">
          <Back aria-hidden className="size-4" />
          {t("back")}
        </Link>
        <ProgressionTitle classId={classId} subjectId={subjectId} />
      </div>
      <ProgressionEditor classId={classId} subjectId={subjectId} />
    </div>
  );
}
