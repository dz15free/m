import { getTranslations } from "next-intl/server";
import { StudentsManager } from "@/features/students/students-manager";

export async function generateMetadata() {
  const t = await getTranslations("students");
  return { title: t("title") };
}

export default async function StudentsPage({ params }: PageProps<"/app/classes/[classId]/students">) {
  const { classId } = await params;
  return <StudentsManager classId={classId} />;
}
