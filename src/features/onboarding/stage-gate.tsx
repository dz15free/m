"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Hourglass, MessageCircle, Settings } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { useTeacher } from "@/features/classes/hooks";
import { openSupport } from "@/features/support/repo";

/** المتوسط والثانوي قيد الإعداد: يسجّلون ويُحفظ ملفهم، ويرون «قريبًا» بدل الأدوات
 *  (عدا الإعدادات والحساب والاشتراك). المحتوى الحالي مبني للابتدائي. */
const OPEN_PATHS = ["/app/settings", "/app/more", "/app/billing"];

export function StageGate({ children }: { children: React.ReactNode }) {
  const t = useTranslations("comingSoon");
  const teacher = useTeacher().data;
  const pathname = usePathname();
  const stage = teacher?.profile.stage;
  if (!stage || stage === "primary" || OPEN_PATHS.some((p) => pathname.startsWith(p))) return <>{children}</>;
  return (
    <section className="mx-auto max-w-lg space-y-5 py-10 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-50 text-brand-700">
        <Hourglass aria-hidden className="size-8" />
      </span>
      <h1 className="text-2xl font-bold">{t("title", { stage: t(`stages.${stage}`) })}</h1>
      <p className="leading-relaxed text-muted">{t("body")}</p>
      <p className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">{t("notify")}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => openSupport(t("supportText"))} className={buttonClass("primary")}>
          <MessageCircle aria-hidden className="size-4" />
          {t("contact")}
        </button>
        <Link href="/app/settings" className={buttonClass("secondary")}>
          <Settings aria-hidden className="size-4" />
          {t("settings")}
        </Link>
      </div>
    </section>
  );
}
