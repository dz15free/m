import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarClock, ChevronLeft, ChevronRight, Printer, Search, UserPlus, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { localeDir } from "@/i18n/config";
import { formatLongDate } from "@/i18n/dates";

/* «اليوم» — الشاشة الرئيسية. في هذه المرحلة تعرض خطوات التجهيز الأولى؛
   حصص اليوم والحضور والتقدّم تُملأ من البيانات بدءًا من Phase 5–10. */
export default async function TodayPage() {
  const t = await getTranslations("today");
  const locale = await getLocale();
  const Chevron = localeDir[locale] === "rtl" ? ChevronLeft : ChevronRight;

  const steps = [
    { key: "classes", href: "/app/classes", icon: Users },
    { key: "students", href: "/app/classes", icon: UserPlus },
    { key: "schedule", href: "/app/schedule", icon: CalendarClock },
  ] as const;

  const quick = [
    { label: t("search"), href: "/app/library", icon: Search },
    { label: t("print"), href: "/app/documents", icon: Printer },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-muted">{formatLongDate(new Date(), locale)}</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{t("greeting")}</h1>
      </header>

      <section aria-labelledby="next-steps" className="space-y-3">
        <h2 id="next-steps" className="text-lg font-semibold">
          {t("nextSteps")}
        </h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {steps.map(({ key, href, icon: Icon }, i) => (
            <li key={key}>
              <Link href={href} className="group block h-full">
                <Card className="flex h-full items-start gap-4 transition-shadow group-hover:shadow-md">
                  <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                    <Icon aria-hidden className="size-6" />
                    <span className="absolute -end-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
                      {i + 1}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{t(`steps.${key}.title`)}</span>
                    <span className="mt-0.5 block text-sm text-muted">{t(`steps.${key}.body`)}</span>
                  </span>
                  <Chevron aria-hidden className="mt-3 size-5 shrink-0 text-muted md:hidden" />
                </Card>
              </Link>
            </li>
          ))}
        </ol>
      </section>

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
