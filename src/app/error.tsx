"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { buttonClass, LinkButton } from "@/components/ui/button";

/* حدّ أخطاء عام: يعرض رسالة ودّية بدل شاشة بيضاء، مع إعادة المحاولة. */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("errors");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main role="alert" className="grid min-h-[70dvh] place-items-center p-6 text-center">
      <div className="max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">{t("errorTitle")}</h1>
        <p className="text-muted">{t("errorBody")}</p>
        {error.digest && <p className="font-mono text-xs text-muted" dir="ltr">#{error.digest}</p>}
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => retry()} className={buttonClass("primary", "md")}>
            <RotateCcw aria-hidden className="size-4" />
            {t("retry")}
          </button>
          <LinkButton href="/app" variant="ghost">{t("goApp")}</LinkButton>
        </div>
      </div>
    </main>
  );
}
