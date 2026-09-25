import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MORE_ITEMS } from "@/components/layout/nav-items";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { localeDir } from "@/i18n/config";
import { AccountCard } from "@/features/auth/account";
import { AdminLink } from "@/features/admin/admin-shell";

export async function generateMetadata() {
  const t = await getTranslations("more");
  return { title: t("title") };
}

export default async function MorePage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const Chevron = localeDir[locale] === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("more.title")}</h1>

      <AccountCard />

      <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
        {MORE_ITEMS.map(({ key, href, icon: Icon }) => (
          <li key={key}>
            <Link href={href} className="flex min-h-14 items-center gap-4 px-4 transition-colors hover:bg-brand-50">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="flex-1 font-medium">{t(`nav.${key}`)}</span>
              <Chevron aria-hidden className="size-5 text-muted" />
            </Link>
          </li>
        ))}
      </ul>

      <AdminLink />

      <div className="flex items-center justify-between gap-4 rounded-card bg-surface p-4 shadow-card">
        <span className="font-medium">{t("common.language")}</span>
        <LocaleSwitcher />
      </div>

      <nav className="flex justify-center gap-5 text-sm text-muted">
        <Link href="/terms" className="hover:underline">{t("legal.terms")}</Link>
        <Link href="/privacy" className="hover:underline">{t("legal.privacy")}</Link>
      </nav>
    </div>
  );
}
