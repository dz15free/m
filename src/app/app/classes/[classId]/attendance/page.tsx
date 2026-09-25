import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AttendanceSheet } from "@/features/attendance/attendance-sheet";

export async function generateMetadata() {
  const t = await getTranslations("attendance");
  return { title: t("title") };
}

export default async function AttendancePage({ params, searchParams }: PageProps<"/app/classes/[classId]/attendance">) {
  const { classId } = await params;
  const { date, part } = await searchParams;
  const t = await getTranslations();
  const Back = (await getLocale()) === "ar" ? ChevronRight : ChevronLeft;
  return (
    <div className="space-y-4">
      <div>
        <Link href={`/app/classes/${classId}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-700">
          <Back aria-hidden className="size-4" />
          {t("classes.detail.back")}
        </Link>
        <h1 className="text-2xl font-bold">{t("attendance.title")}</h1>
      </div>
      <AttendanceSheet
        classId={classId}
        initialDate={typeof date === "string" ? date : undefined}
        initialPart={typeof part === "string" ? part : undefined}
      />
    </div>
  );
}
