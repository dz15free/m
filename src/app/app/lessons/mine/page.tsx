import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FolderHeart, Sparkles } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { SavedMemosList } from "@/features/ai-memo/saved-memos";

export async function generateMetadata() {
  const t = await getTranslations("aiMemo.saved");
  return { title: t("title") };
}

export default async function Page() {
  const t = await getTranslations("aiMemo.saved");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            <FolderHeart aria-hidden className="size-7 text-brand-700" />
            {t("title")}
          </h1>
          <p className="mt-1 text-muted">{t("subtitle")}</p>
        </div>
        <Link
          href="/app/lessons/write"
          className={buttonClass("secondary", "md")}
        >
          <Sparkles aria-hidden className="size-4" />
          {t("writeNew")}
        </Link>
      </div>
      <SavedMemosList />
    </div>
  );
}
