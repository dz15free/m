import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { AccountCard } from "@/features/auth/account";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { InstallButton } from "@/features/pwa/install-button";
import { NAV, SIDEBAR_PRIMARY, SIDEBAR_SECONDARY, type NavItem } from "./nav-items";
import { NavLink } from "./nav-link";

export async function Sidebar() {
  const t = await getTranslations("nav");
  const SessionIcon = NAV.session.icon;

  const renderItems = (items: NavItem[]) =>
    items.map(({ key, href, icon: Icon }) => (
      <li key={key}>
        <NavLink
          href={href}
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-ink/80 transition-colors hover:bg-brand-50 hover:text-ink"
          activeClassName="bg-brand-50! text-brand-800! font-semibold"
        >
          <Icon aria-hidden className="size-5 shrink-0" />
          {t(key)}
        </NavLink>
      </li>
    ));

  return (
    <aside className="sticky top-0 hidden h-dvh print:hidden! w-72 shrink-0 flex-col border-e border-line bg-surface lg:flex">
      <div className="flex items-center justify-between gap-2 ps-6 pe-3 pb-4 pt-6">
        <Link href="/app" aria-label={t("today")}>
          <Logo variant="lockup" className="h-12" priority />
        </Link>
        <NotificationBell />
      </div>

      <div className="px-4 pb-4">
        <Link href={NAV.session.href} className={buttonClass("primary", "md", "w-full")}>
          <SessionIcon aria-hidden className="size-5" />
          {t("sessionHint")}
        </Link>
      </div>

      <nav aria-label={t("main")} className="flex flex-1 flex-col justify-between overflow-y-auto px-4 pb-4">
        <ul className="space-y-1">{renderItems(SIDEBAR_PRIMARY)}</ul>
        <div className="space-y-4 border-t border-line pt-4">
          <ul className="space-y-1">{renderItems(SIDEBAR_SECONDARY)}</ul>
          <InstallButton />
          <LocaleSwitcher />
          <AccountCard compact />
        </div>
      </nav>
    </aside>
  );
}
