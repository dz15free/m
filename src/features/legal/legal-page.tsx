import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { LEGAL_UPDATED, type LegalDoc } from "./content";

/* صفحة قانونية عامة (بلا تسجيل دخول)، قابلة للطباعة. */
export async function LegalPage({ docs }: { docs: Record<"ar" | "fr", LegalDoc> }) {
  const locale = (await getLocale()) === "fr" ? "fr" : "ar";
  const t = await getTranslations("legal");
  const brand = await getTranslations("brand");
  const d = docs[locale];
  const updated = new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ-u-nu-latn" : "fr-DZ", { dateStyle: "long" }).format(new Date(LEGAL_UPDATED));

  return (
    <div className="min-h-dvh bg-surface">
      <header className="border-b border-line/70 pt-safe print:hidden">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" aria-label={brand("name")}>
            <Logo variant="lockup" className="h-9" />
          </Link>
          <LocaleSwitcher />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 py-8 pb-safe sm:px-6">
        <h1 className="text-3xl font-bold">{d.title}</h1>
        <p className="mt-1 text-sm text-muted">{t("updated", { date: updated })}</p>
        <p className="mt-5 leading-relaxed">{d.intro}</p>
        {d.sections.map((s) => (
          <section key={s.h} className="mt-7">
            <h2 className="text-xl font-bold text-brand-800">{s.h}</h2>
            {s.p.map((p, i) => (
              <p key={i} className="mt-2 leading-relaxed text-ink/90">{p}</p>
            ))}
          </section>
        ))}
        <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-5 text-sm font-semibold text-brand-700 print:hidden">
          <Link href="/terms" className="hover:underline">{t("terms")}</Link>
          <Link href="/privacy" className="hover:underline">{t("privacy")}</Link>
          <Link href="/" className="hover:underline">{t("home")}</Link>
        </nav>
      </main>
    </div>
  );
}
