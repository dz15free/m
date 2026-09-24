"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { locales, localeLabel } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";
import { cn } from "@/lib/utils/cn";

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={cn("inline-flex items-center gap-1 rounded-full bg-canvas p-1 ring-1 ring-line", className)}
    >
      <Languages aria-hidden className="mx-2 size-4 text-muted" />
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          disabled={pending}
          aria-pressed={current === locale}
          onClick={() =>
            startTransition(async () => {
              await setLocale(locale);
              router.refresh();
            })
          }
          className={cn(
            "min-h-9 rounded-full px-3 text-sm font-medium transition-colors",
            current === locale ? "bg-brand-700 text-white" : "text-ink hover:bg-brand-50",
          )}
        >
          {localeLabel[locale]}
        </button>
      ))}
    </div>
  );
}
