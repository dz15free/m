import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BookOpenCheck, Printer, Search } from "lucide-react";
import { WelcomeCard } from "@/features/schedule/welcome-card";
import { TodayBoard } from "@/features/schedule/today-board";

/* «اليوم» — الشاشة الرئيسية: حصص اليوم من جدول التوقيت وحالة الحضور لكل حصة،
   وخطوات التجهيز الناقصة فقط (الأقسام، التلاميذ، الجدول). */
export default async function TodayPage() {
  const t = await getTranslations("today");

  const quick = [
    { label: t("lessons"), href: "/app/lessons", icon: BookOpenCheck },
    { label: t("search"), href: "/app/library", icon: Search },
    { label: t("print"), href: "/app/documents", icon: Printer },
  ];

  return (
    <div className="space-y-8">
      <WelcomeCard />

      <TodayBoard />

      <section aria-labelledby="quick" className="space-y-3">
        <h2 id="quick" className="text-lg font-semibold">
          {t("quickActions")}
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:max-w-lg">
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
