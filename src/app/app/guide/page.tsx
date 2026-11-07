import { getTranslations } from "next-intl/server";
import { LifeBuoy } from "lucide-react";
import { GuidePage } from "@/features/guide/guide-page";

export async function generateMetadata() {
  const t = await getTranslations("guide");
  return { title: t("title") };
}

export default async function Page() {
  const t = await getTranslations("guide");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <LifeBuoy aria-hidden className="size-7 text-brand-700" />
          {t("title")}
        </h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </div>
      <GuidePage />
    </div>
  );
}
