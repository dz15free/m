import { getTranslations } from "next-intl/server";
import { ProgressionPrint } from "@/features/planning/progression-print";

export async function generateMetadata() {
  const t = await getTranslations("planning");
  return { title: t("title") };
}

export default async function ProgressionPrintPage({ params, searchParams }: PageProps<"/app/planning/[classId]/[subjectId]/print">) {
  const { classId, subjectId } = await params;
  const { mode } = await searchParams;
  return <ProgressionPrint classId={classId} subjectId={subjectId} mode={mode === "monthly" ? "monthly" : "annual"} />;
}
