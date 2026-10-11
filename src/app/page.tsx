import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  BookOpenCheck,
  CalendarClock,
  Camera,
  Check,
  ClipboardCheck,
  Headset,
  Languages,
  LibraryBig,
  ListChecks,
  Lock,
  MapPin,
  NotebookPen,
  Printer,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Table2,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { PhoneFrame } from "@/features/landing/phone-frame";
import { Testimonials } from "@/features/landing/testimonials";

const FEATURES = [
  { key: "notebook", icon: NotebookPen },
  { key: "lessons", icon: BookOpenCheck },
  { key: "planning", icon: ListChecks },
  { key: "import", icon: Users },
  { key: "attendance", icon: ClipboardCheck },
  { key: "schedule", icon: CalendarClock },
  { key: "grades", icon: Table2 },
  { key: "documents", icon: Printer },
  { key: "library", icon: LibraryBig },
] as const;

const WHY = [
  { key: "local", icon: MapPin },
  { key: "bilingual", icon: Languages },
  { key: "mobile", icon: Smartphone },
  { key: "private", icon: Lock },
  { key: "support", icon: Headset },
] as const;

const CHIP_ICONS = [ShieldCheck, Smartphone, Printer] as const;

/* صفحة الهبوط: الشعار والهوية كما هي، والأقسام مرتّبة من المشكلة إلى الحل إلى الدليل (صور حقيقية وآراء) ثم السعر. */
export default async function LandingPage() {
  const t = await getTranslations("landing");
  const brand = await getTranslations("brand");
  const legal = await getTranslations("legal");
  const steps = t.raw("importSteps") as string[];
  const pains = t.raw("pains") as string[];
  const spotSteps = t.raw("spotSteps") as string[];
  const chips = t.raw("heroChips") as string[];
  const gallery = t.raw("gallery") as { src: string; title: string; body: string }[];
  const faq = t.raw("faq") as { q: string; a: string }[];

  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-surface/90 pt-safe backdrop-blur">
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
            <LinkButton href="/register" className="hidden sm:inline-flex">
              {t("startShort")}
            </LinkButton>
          </div>
        </div>
      </header>

      <main>
        {/* ── البطل: الرسالة والشعار ── */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--color-brand-100),transparent)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 md:grid-cols-2 md:pt-16">
            <div className="order-2 text-center md:order-1 md:text-start">
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">{t("heroTitle")}</h1>
              <p className="mt-4 text-lg text-muted sm:text-xl">{t("heroSubtitle")}</p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center md:justify-start">
                <LinkButton href="/register" size="lg" className="w-full sm:w-auto">
                  {t("start")}
                </LinkButton>
                <LinkButton href="/login" variant="secondary" size="lg" className="w-full sm:w-auto">
                  {t("login")}
                </LinkButton>
              </div>
              <p className="mt-4 text-sm text-muted">{t("heroNote")}</p>
              <ul className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
                {chips.map((c, i) => {
                  const Icon = CHIP_ICONS[i] ?? Check;
                  return (
                    <li key={c} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-brand-900 shadow-card ring-1 ring-brand-100">
                      <Icon aria-hidden className="size-3.5 text-brand-700" />
                      {c}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="order-1 flex justify-center md:order-2">
              <div className="relative">
                <div aria-hidden className="absolute inset-[12%] rounded-full bg-brand-200/50 blur-3xl" />
                <Logo variant="full" className="relative h-56 sm:h-72 lg:h-96" sizes="(min-width: 1024px) 384px, (min-width: 640px) 288px, 224px" priority />
              </div>
            </div>
          </div>
        </section>

        {/* ── المشكلة التي نحلها ── */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-bold leading-snug sm:text-3xl">{t("problemTitle")}</h2>
              <p className="mt-4 leading-relaxed text-muted">{t("problemBody")}</p>
            </div>
            <ul className="space-y-3">
              {pains.map((pain) => (
                <li key={pain} className="flex items-center gap-3 rounded-card bg-canvas p-4 ring-1 ring-line">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-red-50 text-red-700">
                    <X aria-hidden className="size-4" />
                  </span>
                  <span className="font-medium">{pain}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── الرسالة الأساسية: الدفتر اليومي يكتب نفسه (مع صورة حقيقية) ── */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid items-center gap-10 overflow-hidden rounded-[2rem] bg-brand-50 p-6 sm:p-10 md:grid-cols-[1.2fr_1fr] md:p-14">
            <div>
              <span className="inline-grid size-12 place-items-center rounded-2xl bg-brand-700 text-white">
                <NotebookPen aria-hidden className="size-6" />
              </span>
              <h2 className="mt-4 text-2xl font-bold sm:text-3xl">{t("spotTitle")}</h2>
              <p className="mt-3 leading-relaxed text-ink/80">{t("spotBody")}</p>
              <ol className="mt-6 space-y-3">
                {spotSteps.map((step, i) => (
                  <li key={step} className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-700 font-bold text-white">{i + 1}</span>
                    <span className="font-semibold">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <PhoneFrame src="/landing/daily.webp" alt={t("spotShot")} className="max-w-[16.5rem] md:-mb-24" />
          </div>
        </section>

        {/* ── الميزات ── */}
        <section className="bg-canvas py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">{t("featuresTitle")}</h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ key, icon: Icon }) => (
                <li key={key} className="group rounded-card bg-surface p-6 shadow-card ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md">
                  <span className="grid size-12 place-items-center rounded-2xl bg-brand-100 text-brand-700 transition group-hover:bg-brand-700 group-hover:text-white">
                    <Icon aria-hidden className="size-6" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{t(`features.${key}.title`)}</h3>
                  <p className="mt-1.5 leading-relaxed text-muted">{t(`features.${key}.body`)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── من داخل المنصة: صور حقيقية ── */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-brand-700">{t("galleryEyebrow")}</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{t("galleryTitle")}</h2>
          </div>
          <ul className="-mx-4 mt-12 flex snap-x snap-mandatory gap-8 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
            {gallery.map((g) => (
              <li key={g.src} className="w-[70vw] max-w-[17rem] shrink-0 snap-center text-center md:w-auto md:max-w-none">
                <PhoneFrame src={`/landing/${g.src}.webp`} alt={g.title} className="max-w-[15.5rem]" />
                <h3 className="mt-6 text-lg font-bold">{g.title}</h3>
                <p className="mt-1 text-sm text-muted">{g.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-xs text-muted">{t("demoNote")}</p>
        </section>

        {/* ── الاستيراد الذكي ── */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
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
                  <span className="grid size-7 place-items-center rounded-full bg-brand-400 text-sm font-bold text-brand-950">{i + 1}</span>
                  <span className="font-medium">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── آراء الأساتذة (تظهر حين توجد) ── */}
        <Testimonials />

        {/* ── لماذا نحن ── */}
        <section className="bg-canvas py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">{t("whyTitle")}</h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {WHY.map(({ key, icon: Icon }) => (
                <li key={key} className="rounded-card bg-surface p-5 shadow-card">
                  <Icon aria-hidden className="size-6 text-brand-700" />
                  <h3 className="mt-3 font-semibold">{t(`why.${key}.title`)}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{t(`why.${key}.body`)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── التجربة والسعر ── */}
        <section id="pricing" className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <div className="text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent-100 text-accent-700">
              <Sparkles aria-hidden className="size-6" />
            </span>
            <h2 className="mt-4 text-2xl font-bold sm:text-3xl">{t("trialTitle")}</h2>
            <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-muted">{t("trialBody")}</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="flex flex-col rounded-3xl bg-canvas p-7 ring-1 ring-line">
              <p className="font-semibold text-muted">{t("trialName")}</p>
              <p className="mt-2 text-4xl font-bold">{t("trialPrice")}</p>
              <ul className="mt-6 flex-1 space-y-3">
                {(t.raw("trialPoints") as string[]).map((x) => (
                  <li key={x} className="flex items-start gap-2.5">
                    <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-600" />
                    {x}
                  </li>
                ))}
              </ul>
              <LinkButton href="/register" variant="secondary" size="lg" className="mt-8">
                {t("start")}
              </LinkButton>
            </div>
            <div className="relative flex flex-col rounded-3xl bg-linear-to-br from-brand-900 via-brand-800 to-brand-700 p-7 text-white shadow-[0_24px_60px_-24px_rgba(4,47,38,0.6)]">
              <span className="absolute -top-3 end-6 rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-ink">{t("popular")}</span>
              <p className="font-semibold text-white/75">{t("yearName")}</p>
              <p className="mt-2 flex items-baseline gap-2">
                <bdi className="text-4xl font-bold">{t("yearPrice")}</bdi>
                <span className="text-white/75">{t("yearPer")}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {(t.raw("yearPoints") as string[]).map((x) => (
                  <li key={x} className="flex items-start gap-2.5">
                    <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-300" />
                    {x}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 font-semibold text-brand-900 hover:bg-brand-50">
                {t("start")}
              </Link>
            </div>
          </div>
        </section>

        {/* ── أسئلة شائعة ── */}
        <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">{t("faqTitle")}</h2>
          <div className="mt-8 divide-y divide-line overflow-hidden rounded-card bg-canvas ring-1 ring-line">
            {faq.map(({ q, a }) => (
              <details key={q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                  {q}
                  <span aria-hidden className="text-xl text-brand-700 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── دعوة أخيرة ── */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="flex flex-col items-center gap-5 rounded-[2rem] bg-brand-50 px-6 py-12 text-center">
            <Logo variant="mark" className="h-16" />
            <h2 className="text-2xl font-bold sm:text-3xl">{t("ctaTitle")}</h2>
            <p className="max-w-xl text-muted">{t("ctaBody")}</p>
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

      {/* زر التسجيل ثابت على الهاتف */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
        <LinkButton href="/register" size="lg" className="w-full">
          {t("start")}
        </LinkButton>
      </div>

      <footer className="border-t border-line pb-20 sm:pb-0">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted">
            <ShieldCheck aria-hidden className="size-4 text-brand-700" />
            <span>
              © {new Date().getFullYear()} {t("footer")}
            </span>
          </div>
          <nav className="flex gap-5 text-sm text-muted">
            <Link href="/terms" className="hover:underline">{legal("terms")}</Link>
            <Link href="/privacy" className="hover:underline">{legal("privacy")}</Link>
          </nav>
          <div className="sm:hidden">
            <LocaleSwitcher />
          </div>
        </div>
      </footer>
    </div>
  );
}
