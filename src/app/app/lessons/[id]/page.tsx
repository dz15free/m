import { getTranslations } from "next-intl/server";
import { LessonView } from "@/features/lessons/lesson-view";

export async function generateMetadata() {
  const t = await getTranslations("lessons");
  return { title: t("title") };
}

export default async function LessonPage({ params }: PageProps<"/app/lessons/[id]">) {
  const { id } = await params;
  return <LessonView id={decodeURIComponent(id)} />;
}
