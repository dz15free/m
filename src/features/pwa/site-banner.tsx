"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Info, Megaphone, PartyPopper, TriangleAlert, X } from "lucide-react";
import { getAppConfig } from "@/features/billing/repo";
import { cn } from "@/lib/utils/cn";
import type { Banner } from "@/shared/billing/plans";

const TONE: Record<Banner["tone"], { cls: string; icon: typeof Info }> = {
  info: { cls: "bg-brand-700 text-white", icon: Info },
  success: { cls: "bg-green-700 text-white", icon: PartyPopper },
  warning: { cls: "bg-amber-400 text-amber-950", icon: TriangleAlert },
  promo: { cls: "bg-linear-to-l from-accent-700 to-brand-700 text-white", icon: Megaphone },
};
const KEY = "bannerDismissed";

/* شريط أسفل الترويسة يتحكم فيه الأدمن (config/app.banner). الإغلاق يُحفظ لنسخة الإعلان
   الحالية فقط: إعلان جديد يظهر من جديد. */
export function SiteBanner() {
  const locale = useLocale() as "ar" | "fr";
  const config = useQuery({ queryKey: ["appConfig"], queryFn: getAppConfig, staleTime: 5 * 60_000, refetchOnWindowFocus: true });
  const [dismissed, setDismissed] = useState(() => {
    try {
      return typeof window === "undefined" ? "" : (localStorage.getItem(KEY) ?? "");
    } catch {
      return "";
    }
  });
  const b = config.data?.banner;
  const text = b ? b.text[locale] || b.text[locale === "ar" ? "fr" : "ar"] : "";
  if (!b?.enabled || !text || dismissed === String(b.version)) return null;
  return (
    <BannerView
      banner={b}
      text={text}
      onDismiss={() => {
        try {
          localStorage.setItem(KEY, String(b.version));
        } catch {}
        setDismissed(String(b.version));
      }}
    />
  );
}

/** معاينة في لوحة الإدارة (بلا إغلاق). */
export function SiteBannerPreview({ banner }: { banner: Banner }) {
  const locale = useLocale() as "ar" | "fr";
  const text = banner.text[locale] || banner.text[locale === "ar" ? "fr" : "ar"] || "…";
  return <BannerView banner={banner} text={text} />;
}

function BannerView({ banner: b, text, onDismiss }: { banner: Banner; text: string; onDismiss?: () => void }) {
  const t = useTranslations("pwa");
  const locale = useLocale() as "ar" | "fr";
  const { cls, icon: Icon } = TONE[b.tone] ?? TONE.info;
  const Chevron = locale === "ar" ? ChevronLeft : ChevronRight;
  const content = (
    <>
      <Icon aria-hidden className="size-5 shrink-0" />
      <span dir="auto" className="min-w-0 flex-1 text-sm font-medium">{text}</span>
      {b.link && <Chevron aria-hidden className="size-4 shrink-0" />}
    </>
  );
  return (
    <div role="region" aria-label={t("banner")} className={cn("flex items-center gap-2 px-4 py-2.5 print:hidden lg:px-10", cls)}>
      {b.link ? (
        b.link.startsWith("/") ? (
          <Link href={b.link} className="flex min-w-0 flex-1 items-center gap-2 hover:underline">{content}</Link>
        ) : (
          <a href={b.link} target="_blank" rel="noopener" className="flex min-w-0 flex-1 items-center gap-2 hover:underline">{content}</a>
        )
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">{content}</div>
      )}
      {onDismiss && (
        <button type="button" aria-label={t("close")} onClick={onDismiss} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-black/10">
          <X aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}
