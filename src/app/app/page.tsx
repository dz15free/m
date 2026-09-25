import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Printer, Search } from "lucide-react";
import { formatLongDate } from "@/i18n/dates";
import { Greeting } from "@/features/auth/account";
import { TodayBoard } from "@/features/schedule/today-board";
import { TrialOffer } from "@/features/billing/trial-offer";

/* «اليوم» — الشاشة الرئيسية: حصص اليوم من جدول التوقيت وحالة الحضور لكل حصة،
   وخطوات التجهيز الناقصة فقط (الأقسام، التلاميذ، الجدول). */
export default async function TodayPage() {
  const t = await getTranslations("today");
  const locale = await getLocale();

  const quick = [
    { label: t("search"), href: "/app/library", icon: Search },
    { label: t("print"), href: "/app/documents", icon: Printer },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted">{formatLongDate(new Date(), locale)}</p>
        <Greeting className="mt-1 text-2xl font-bold sm:text-3xl" />
      </header>

      {/* عرض التجربة بعد إكمال المعالج (القرار المعتمد) حتى تُستعمل أو تُؤجَّل */}
      <TrialOffer />

      <TodayBoard />

      <section aria-labelledby="quick" className="space-y-3">
        <h2 id="quick" className="text-lg font-semibold">
          {t("quickActions")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          {quick.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-card bg-surface p-4 text-center text-sm font-medium shadow-card transition-shadow hover:shadow-md"
            >
              <Icon aria-hidden className="size-6 text-brand-700" />
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
