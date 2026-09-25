import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PrepEditor } from "@/features/logbook/prep-editor";

export async function generateMetadata() {
  const t = await getTranslations("logbook.prep");
  return { title: t("title") };
}

export default async function PrepPage({ params }: PageProps<"/app/logbook/prep/[prepId]">) {
  const { prepId } = await params;
  const t = await getTranslations("logbook.prep");
  const Back = (await getLocale()) === "ar" ? ChevronRight : ChevronLeft;
  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <Link href="/app/logbook/prep" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-700">
          <Back aria-hidden className="size-4" />
          {t("back")}
        </Link>
        <h1 className="text-2xl font-bold">{prepId === "new" ? t("new") : t("edit")}</h1>
      </div>
      <PrepEditor prepId={prepId} />
    </div>
  );
}
