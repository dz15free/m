import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ContentView } from "@/features/library/content-view";

export async function generateMetadata() {
  const t = await getTranslations("library");
  return { title: t("title") };
}

export default async function ContentPage({ params }: PageProps<"/app/library/[contentId]">) {
  const { contentId } = await params;
  const t = await getTranslations("library");
  const Back = (await getLocale()) === "ar" ? ChevronRight : ChevronLeft;
  return (
    <div className="space-y-3">
      <Link href="/app/library" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-700">
        <Back aria-hidden className="size-4" />
        {t("back")}
      </Link>
      <ContentView contentId={contentId} />
    </div>
  );
}
