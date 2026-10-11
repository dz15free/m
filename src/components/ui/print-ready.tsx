"use client";

import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { PrintButtons } from "./print-actions";

/* صفحة تُفتح «جاهزة للطباعة» (الدفتر اليومي ?print=1، طباعة التوزيعات): شريط ظاهر بزرّين منفصلين
   «طباعة» و«حفظ PDF». لا طباعة تلقائية: الهواتف تمنعها، والأستاذ يختار ما يريد بلمسة واحدة. */
export function PrintReady({ ready, title }: { ready: boolean; title: string | (() => string) }) {
  const t = useTranslations("common.printReady");
  if (!ready) return null;
  return (
    <div className="sticky top-2 z-30 print:hidden">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-brand-800 p-3 text-white shadow-float">
        <FileText aria-hidden className="size-6 shrink-0" />
        <p className="min-w-0 flex-1 basis-48 text-sm font-medium">{t("body")}</p>
        <PrintButtons title={title} tone="dark" />
      </div>
    </div>
  );
}
