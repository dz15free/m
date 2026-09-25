import { getTranslations } from "next-intl/server";
import { Library } from "lucide-react";
import { LibraryBrowser } from "@/features/library/library-browser";

export async function generateMetadata() {
  const t = await getTranslations("library");
  return { title: t("title") };
}

export default async function LibraryPage() {
  const t = await getTranslations("library");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <Library aria-hidden className="size-7 text-brand-700" />
          {t("title")}
        </h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </div>
      <LibraryBrowser />
    </div>
  );
}
