import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  CalendarClock,
  Camera,
  Check,
  ClipboardCheck,
  LibraryBig,
  ListChecks,
  Printer,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";

const FEATURES = [
  { key: "import", icon: Users },
  { key: "attendance", icon: ClipboardCheck },
  { key: "schedule", icon: CalendarClock },
  { key: "planning", icon: ListChecks },
  { key: "library", icon: LibraryBig },
  { key: "documents", icon: Printer },
] as const;

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const brand = await getTranslations("brand");
  const steps = t.raw("importSteps") as string[];

  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-surface/90 pt-safe backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" aria-label={brand("name")}>
            <Logo variant="lockup" className="h-9 sm:h-10" priority />
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <LocaleSwitcher />
            </div>
            <LinkButton href="/login" variant="ghost">
              {t("login")}
            </LinkButton>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--color-brand-100),transparent)]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 md:grid-cols-2 md:pt-16">
            <div className="order-2 text-center md:order-1 md:text-start">
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">{t("heroTitle")}</h1>
              <p className="mt-4 text-lg text-muted sm:text-xl">{t("heroSubtitle")}</p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start sm:justify-center">
                <LinkButton href="/register" size="lg" className="w-full sm:w-auto">
                  {t("start")}
                </LinkButton>
                <LinkButton href="/login" variant="secondary" size="lg" className="w-full sm:w-auto">
                  {t("login")}
                </LinkButton>
              </div>
              <p className="mt-4 text-sm text-muted">{t("heroNote")}</p>
            </div>
            <div className="order-1 flex justify-center md:order-2">
              <Logo variant="full" className="h-56 sm:h-72 lg:h-96" priority />
            </div>
          </div>
        </section>

        {/* الاستيراد الذكي — الميزة الأبرز */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-6 rounded-[2rem] bg-linear-to-br from-brand-950 via-brand-800 to-brand-600 p-6 text-white sm:p-10 md:grid-cols-[1fr_auto]">
            <div>
              <span className="inline-grid size-12 place-items-center rounded-2xl bg-white/10">
                <Camera aria-hidden className="size-6" />
              </span>
              <h2 className="mt-4 text-2xl font-bold sm:text-3xl">{t("importTitle")}</h2>
              <p className="mt-3 max-w-xl text-white/85">{t("importBody")}</p>
            </div>
            <ol className="flex flex-wrap gap-3 md:flex-col">
              {steps.map((step, i) => (
                <li key={step} className="flex items-center gap-3 rounded-full bg-white/10 px-4 py-2">
                  <span className="grid size-7 place-items-center rounded-full bg-brand-400 text-sm font-bold text-brand-950">
                    {i + 1}
                  </span>
                  <span className="font-medium">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* الميزات */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">{t("featuresTitle")}</h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ key, icon: Icon }) => (
              <li key={key} className="rounded-card bg-canvas p-6 ring-1 ring-line">
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-100 text-brand-700">
                  <Icon aria-hidden className="size-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{t(`features.${key}.title`)}</h3>
                <p className="mt-1.5 text-muted">{t(`features.${key}.body`)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* دعوة أخيرة */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="flex flex-col items-center gap-5 rounded-[2rem] bg-brand-50 px-6 py-12 text-center">
            <Logo variant="mark" className="h-16" />
            <h2 className="text-2xl font-bold sm:text-3xl">{t("ctaTitle")}</h2>
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-brand-800">
              {[t("heroNote"), brand("tagline")].map((line) => (
                <li key={line} className="flex items-center gap-2">
                  <Check aria-hidden className="size-4" />
                  {line}
                </li>
              ))}
            </ul>
            <LinkButton href="/register" size="lg">
              {t("start")}
            </LinkButton>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 pb-safe sm:flex-row sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted">
            <ShieldCheck aria-hidden className="size-4 text-brand-700" />
            <span>
              © {new Date().getFullYear()} {t("footer")}
            </span>
          </div>
          <div className="sm:hidden">
            <LocaleSwitcher />
          </div>
        </div>
      </footer>
    </div>
  );
}
