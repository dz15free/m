import { getTranslations } from "next-intl/server";
import { AttendanceStats } from "@/features/attendance/attendance-stats";

export async function generateMetadata() {
  const t = await getTranslations("attendance");
  return { title: t("statsTitle") };
}

export default async function AttendanceStatsPage({ params }: PageProps<"/app/classes/[classId]/attendance/stats">) {
  const { classId } = await params;
  return <AttendanceStats classId={classId} />;
}
