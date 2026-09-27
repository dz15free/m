import { getTranslations } from "next-intl/server";
import { BookOpenCheck } from "lucide-react";
import { LessonsBrowser } from "@/features/lessons/lessons-browser";

export async function generateMetadata() {
  const t = await getTranslations("lessons");
  return { title: t("title") };
}

export default async function LessonsPage() {
  const t = await getTranslations("lessons");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <BookOpenCheck aria-hidden className="size-7 text-brand-700" />
          {t("title")}
        </h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </div>
      <LessonsBrowser />
    </div>
  );
}
