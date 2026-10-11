"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";

/* صفحة تُفتح «جاهزة للطباعة» (الدفتر اليومي ?print=1، طباعة التوزيعات): شريط ظاهر بزر «طباعة أو حفظ PDF».
   الهواتف (iPhone خاصة) تتجاهل window.print() إن لم تأتِ من لمسة مباشرة، فالطباعة التلقائية بعد تحميل البيانات
   لا تظهر هناك؛ لذلك نطبع تلقائيًا على الحاسوب فقط، ويبقى الزر للجميع (لمسته تفتح نافذة الطباعة دائمًا). */
export function PrintReady({ ready }: { ready: boolean }) {
  const t = useTranslations("common.printReady");
  const done = useRef(false);

  useEffect(() => {
    if (!ready || done.current) return;
    const desktop = window.matchMedia("(pointer: fine)").matches && !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!desktop) return;
    const id = window.setTimeout(() => {
      done.current = true;
      window.print();
    }, 600);
    return () => window.clearTimeout(id);
  }, [ready]);

  if (!ready) return null;
  return (
    <div className="sticky top-2 z-30 print:hidden">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-brand-800 p-3 text-white shadow-float">
        <Printer aria-hidden className="size-6 shrink-0" />
        <p className="min-w-0 flex-1 text-sm font-medium">{t("body")}</p>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 font-semibold text-brand-900 hover:bg-brand-50"
        >
          <Printer aria-hidden className="size-4" />
          {t("button")}
        </button>
      </div>
    </div>
  );
}
