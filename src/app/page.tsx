import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  BookOpenCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Headset,
  Languages,
  Lock,
  MapPin,
  NotebookPen,
  Printer,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  WifiOff,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { cn } from "@/lib/utils/cn";
import { MemoBadge, Testimonials } from "@/features/landing/testimonials";

const DAY_ICONS = [CalendarClock, NotebookPen, ClipboardCheck, Printer] as const;
const BADGE_ICONS = [ShieldCheck, Languages, WifiOff, Printer, Lock] as const;
const WHY = [
  { key: "local", icon: MapPin },
  { key: "languages", icon: Languages },
  { key: "mobile", icon: Smartphone },
  { key: "private", icon: Lock },
  { key: "support", icon: Headset },
] as const;

/** إطار هاتف حول لقطة من التطبيق. */
function Phone({ src, alt, className, priority }: { src: string; alt: string; className?: string; priority?: boolean }) {
  return (
    <div className={cn("relative rounded-[2.6rem] bg-ink p-2.5 shadow-[0_30px_80px_-20px_rgba(4,47,38,0.55)] ring-1 ring-black/10", className)}>
      <div aria-hidden className="absolute start-1/2 top-3.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink rtl:translate-x-1/2" />
      <div className="overflow-hidden rounded-[2.1rem] bg-surface">
        <Image src={src} alt={alt} width={720} height={968} priority={priority} className="h-auto w-full" />
      </div>
    </div>
  );
}

/** إطار نافذة متصفح حول لقطة سطح المكتب. */
function Browser({ src, alt, width, height, className }: { src: string; alt: string; width: number; height: number; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl bg-surface shadow-[0_24px_60px_-24px_rgba(4,47,38,0.45)] ring-1 ring-line", className)}>
      <div aria-hidden className="flex items-center gap-1.5 border-b border-line bg-canvas px-4 py-2.5" dir="ltr">
        <span className="size-2.5 rounded-full bg-red-300" />
        <span className="size-2.5 rounded-full bg-amber-300" />
        <span className="size-2.5 rounded-full bg-green-300" />
      </div>
      <Image src={src} alt={alt} width={width} height={height} className="h-auto w-full" />
    </div>
  );
}

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const brand = await getTranslations("brand");
  const legal = await getTranslations("legal");
  const ready = t.raw("ready") as string[];
  const badges = t.raw("badges") as string[];
  const day = t.raw("day") as { title: string; body: string }[];
  const faq = t.raw("faq") as { q: string; a: string }[];
  const pillar = (k: "prep" | "class" | "docs") => ({ eyebrow: t(`pillars.${k}.eyebrow`), title: t(`pillars.${k}.title`), points: t.raw(`pillars.${k}.points`) as string[] });
  const pillars = [
    { ...pillar("prep"), icon: BookOpenCheck, shot: <Browser src="/landing/monthly.webp" alt={t("shotMonthly")} width={1400} height={753} /> },
    { ...pillar("class"), icon: Users, shot: <Phone src="/landing/attendance.webp" alt={t("shotAttendance")} className="mx-auto w-64 sm:w-72" /> },
    { ...pillar("docs"), icon: Printer, shot: <Browser src="/landing/print.webp" alt={t("shotPrint")} width={1400} height={1062} /> },
  ];

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
        {/* ── البطل ── */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(55%_60%_at_70%_10%,var(--color-brand-100),transparent),radial-gradient(40%_50%_at_10%_30%,var(--color-accent-100),transparent)] opacity-90" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 md:grid-cols-[1.15fr_1fr] md:pt-16">
            <div className="text-center md:text-start">
              <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 ring-1 ring-brand-200">
                <Sparkles aria-hidden className="size-3.5" />
                {t("heroEyebrow")}
              </p>
              <h1 className="mt-5 text-4xl font-bold leading-[1.15] sm:text-5xl lg:text-6xl">{t("heroTitle")}</h1>
              <p className="mt-4 text-lg leading-relaxed text-muted sm:text-xl">{t("heroSubtitle")}</p>
              <ul className="mx-auto mt-6 max-w-md space-y-2.5 text-start md:mx-0">
                {ready.map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-600" />
                    <span className="font-medium">{line}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center md:justify-start">
                <LinkButton href="/register" size="lg" className="w-full sm:w-auto">
                  {t("start")}
                </LinkButton>
                <LinkButton href="/login" variant="secondary" size="lg" className="w-full sm:w-auto">
                  {t("login")}
                </LinkButton>
              </div>
              <p className="mt-4 text-sm text-muted">{t("heroNote")}</p>
            </div>
            <div className="relative mx-auto w-full max-w-[19rem]">
              <Phone src="/landing/daily.webp" alt={t("shotDaily")} priority />
              <div className="absolute -start-8 top-24 hidden items-center gap-2 rounded-2xl bg-surface px-4 py-3 shadow-float ring-1 ring-line sm:flex">
                <span className="grid size-9 place-items-center rounded-full bg-green-100 text-green-700">
                  <Check aria-hidden className="size-5" />
                </span>
                <span className="text-sm font-semibold">{t("heroBadge")}</span>
              </div>
              <MemoBadge label={t("memosLabel")} className="absolute -end-6 bottom-16 hidden rounded-2xl bg-brand-900 px-4 py-3 text-white shadow-float sm:block" />
            </div>
          </div>
        </section>

        {/* ── شارات الثقة ── */}
        <section aria-label={t("heroEyebrow")} className="border-y border-line bg-canvas">
          <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-5 text-sm font-semibold text-ink/80 sm:px-6">
            {badges.map((b, i) => {
              const Icon = BADGE_ICONS[i] ?? Check;
              return (
                <li key={b} className="flex items-center gap-2">
                  <Icon aria-hidden className="size-4 text-brand-700" />
                  {b}
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── يومك مع المساعد ── */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-brand-700">{t("dayEyebrow")}</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">{t("dayTitle")}</h2>
          </div>
          <ol className="relative mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <span aria-hidden className="absolute inset-x-[12%] top-8 hidden h-0.5 bg-linear-to-l from-brand-200 via-brand-400 to-brand-200 lg:block" />
            {day.map((d, i) => {
              const Icon = DAY_ICONS[i] ?? Check;
              return (
                <li key={d.title} className="relative rounded-3xl bg-surface p-6 text-center shadow-card ring-1 ring-line">
                  <span className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-brand-700 text-white shadow-lg shadow-brand-700/30">
                    <Icon aria-hidden className="size-7" />
                    <span className="absolute -end-2 -top-2 grid size-7 place-items-center rounded-full bg-amber-300 text-sm font-bold text-ink">{i + 1}</span>
                  </span>
                  <h3 className="mt-5 text-lg font-bold">{d.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{d.body}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ── المحاور الثلاثة ── */}
        <section className="bg-canvas py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold sm:text-4xl">{t("pillarsTitle")}</h2>
            <div className="mt-14 space-y-20">
              {pillars.map((p, i) => (
                <article key={p.eyebrow} className="grid items-center gap-10 md:grid-cols-2">
                  <div className={cn(i % 2 === 1 && "md:order-2")}>
                    <p className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-sm font-bold text-brand-800">
                      <p.icon aria-hidden className="size-4" />
                      {p.eyebrow}
                    </p>
                    <h3 className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">{p.title}</h3>
                    <ul className="mt-6 space-y-3">
                      {p.points.map((x) => (
                        <li key={x} className="flex items-start gap-3">
                          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
                            <Check aria-hidden className="size-3.5" />
                          </span>
                          <span className="leading-relaxed">{x}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={cn(i % 2 === 1 && "md:order-1")}>{p.shot}</div>
                </article>
              ))}
            </div>
            <p className="mt-12 text-center text-xs text-muted">{t("demoNote")}</p>
          </div>
        </section>

        {/* ── آراء الأساتذة ── */}
        <Testimonials />

        {/* ── لماذا نحن ── */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">{t("whyTitle")}</h2>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {WHY.map(({ key, icon: Icon }) => (
              <li key={key} className="rounded-3xl bg-canvas p-6 ring-1 ring-line">
                <span className="grid size-11 place-items-center rounded-2xl bg-brand-100 text-brand-700">
                  <Icon aria-hidden className="size-5" />
                </span>
                <h3 className="mt-4 font-bold">{t(`why.${key}.title`)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(`why.${key}.body`)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── الأسعار ── */}
        <section id="pricing" className="bg-canvas py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold sm:text-4xl">{t("pricingTitle")}</h2>
              <p className="mt-3 text-muted">{t("pricingSubtitle")}</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <div className="flex flex-col rounded-3xl bg-surface p-7 ring-1 ring-line">
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
              <div className="relative flex flex-col rounded-3xl bg-linear-to-br from-brand-900 via-brand-800 to-brand-700 p-7 text-white shadow-float">
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
            <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-muted">
              <ShieldCheck aria-hidden className="size-4 shrink-0 text-brand-700" />
              {t("keepData")}
            </p>
          </div>
        </section>

        {/* ── أسئلة شائعة ── */}
        <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">{t("faqTitle")}</h2>
          <div className="mt-10 divide-y divide-line overflow-hidden rounded-3xl bg-canvas ring-1 ring-line">
            {faq.map(({ q, a }) => (
              <details key={q} className="group px-6 py-4">
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
          <div className="relative overflow-hidden rounded-[2rem] bg-linear-to-br from-brand-950 via-brand-800 to-brand-600 px-6 py-14 text-center text-white">
            <div aria-hidden className="pointer-events-none absolute -bottom-24 start-1/2 size-96 -translate-x-1/2 rounded-full bg-brand-400/30 blur-3xl rtl:translate-x-1/2" />
            <Logo variant="mark" className="relative mx-auto h-16" />
            <h2 className="relative mt-5 text-3xl font-bold sm:text-4xl">{t("ctaTitle")}</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-white/80">{t("ctaBody")}</p>
            <Link href="/register" className="relative mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-8 text-lg font-semibold text-brand-900 hover:bg-brand-50">
              {t("start")}
            </Link>
            <p className="relative mt-4 text-sm text-white/70">{t("heroNote")}</p>
          </div>
        </section>
      </main>

      {/* زر ثابت على الهاتف */}
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
              © {new Date().getFullYear()} {brand("name")}
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
