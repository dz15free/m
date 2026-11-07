import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { AiMemoWriter } from "@/features/ai-memo/ai-memo-writer";

export async function generateMetadata() {
  const t = await getTranslations("aiMemo");
  return { title: t("title") };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ lesson?: string }> }) {
  const { lesson } = await searchParams;
  const t = await getTranslations("aiMemo");
  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <Sparkles aria-hidden className="size-7 text-brand-700" />
          {t("title")}
        </h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </div>
      <AiMemoWriter lesson={typeof lesson === "string" && /^(?:PRE|[1-5]AP|[1-4]AM)_[a-z]{2,16}_\d{3}$/.test(lesson) ? lesson : undefined} />
    </div>
  );
}
