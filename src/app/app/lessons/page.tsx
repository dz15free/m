import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { BookOpenCheck, Sparkles } from "lucide-react";
import { LessonsBrowser } from "@/features/lessons/lessons-browser";

export async function generateMetadata() {
  const t = await getTranslations("lessons");
  return { title: t("title") };
}

export default async function LessonsPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const { level } = await searchParams;
  const t = await getTranslations("lessons");
  const ta = await getTranslations("aiMemo");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <BookOpenCheck aria-hidden className="size-7 text-brand-700" />
          {t("title")}
        </h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </div>
      <Link
        href="/app/lessons/write"
        className="flex items-center gap-4 rounded-card bg-gradient-to-br from-brand-700 to-brand-900 p-4 text-white shadow-card transition-opacity hover:opacity-95"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15">
          <Sparkles aria-hidden className="size-6" />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold">{ta("cta")}</span>
          <span className="block text-sm text-white/80">{ta("ctaBody")}</span>
        </span>
      </Link>
      <LessonsBrowser level={typeof level === "string" ? level : undefined} />
    </div>
  );
}
