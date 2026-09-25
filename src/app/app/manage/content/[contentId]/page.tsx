import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ContentAdminEditor } from "@/features/library/content-editor";

export async function generateMetadata() {
  const t = await getTranslations("contentAdmin");
  return { title: t("title") };
}

export default async function ContentAdminEditPage({ params, searchParams }: PageProps<"/app/manage/content/[contentId]">) {
  const { contentId } = await params;
  const { stage } = await searchParams;
  const t = await getTranslations("contentAdmin");
  const Back = (await getLocale()) === "ar" ? ChevronRight : ChevronLeft;
  return (
    <div className="space-y-3">
      <Link href="/app/manage/content" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-700">
        <Back aria-hidden className="size-4" />
        {t("title")}
      </Link>
      <h1 className="text-2xl font-bold">{contentId === "new" ? t("new") : t("edit")}</h1>
      <ContentAdminEditor contentId={contentId} stage={typeof stage === "string" ? stage : undefined} />
    </div>
  );
}
