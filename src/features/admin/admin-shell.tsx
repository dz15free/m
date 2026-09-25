"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Bell,
  CreditCard,
  FolderCog,
  Gauge,
  History,
  LayoutPanelTop,
  MessagesSquare,
  ShieldAlert,
  Tags,
  Users,
  ArrowRightLeft,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth, type Role } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils/cn";

type NavKey = "dashboard" | "teachers" | "support" | "content" | "notifications" | "plans" | "payments" | "settings" | "audit";
type Item = { key: NavKey; href: string; icon: typeof Gauge; roles: Role[] };

export const ADMIN_NAV: Item[] = [
  { key: "dashboard", href: "/admin", icon: Gauge, roles: ["admin", "finance"] },
  { key: "teachers", href: "/admin/teachers", icon: Users, roles: ["admin"] },
  { key: "support", href: "/admin/support", icon: MessagesSquare, roles: ["admin"] },
  { key: "content", href: "/admin/content", icon: FolderCog, roles: ["admin", "contentEditor"] },
  { key: "notifications", href: "/admin/notifications", icon: Bell, roles: ["admin"] },
  { key: "plans", href: "/admin/plans", icon: Tags, roles: ["admin"] },
  { key: "payments", href: "/admin/payments", icon: CreditCard, roles: ["admin", "finance"] },
  { key: "settings", href: "/admin/settings", icon: LayoutPanelTop, roles: ["admin"] },
  { key: "audit", href: "/admin/audit", icon: History, roles: ["admin"] },
];

export function useRoles(): Role[] {
  const auth = useAuth();
  return auth.status === "signedIn" ? auth.roles : [];
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin");
  const roles = useRoles();
  const pathname = usePathname();
  const items = ADMIN_NAV.filter((i) => i.roles.some((r) => roles.includes(r)));
  const current = items.find((i) => (i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href)));

  if (!items.length) {
    return (
      <div className="grid min-h-dvh place-items-center p-4">
        <Card className="flex max-w-sm flex-col items-center gap-3 py-10 text-center">
          <ShieldAlert aria-hidden className="size-8 text-red-700" />
          <p className="text-muted">{t("forbidden")}</p>
          <Link href="/app" className={buttonClass("secondary")}>{t("backToApp")}</Link>
        </Card>
      </div>
    );
  }
  // صفحة لا يملك صلاحيتها (مثل محرّر يفتح /admin): نوجّهه لأول قسم مسموح
  const allowed = !!current || pathname.startsWith("/admin/content");

  const link = (i: Item, mobile = false) => {
    const Icon = i.icon;
    const active = current?.key === i.key;
    return (
      <Link
        key={i.key}
        href={i.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          mobile
            ? "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium"
            : "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium",
          active ? "bg-brand-700 text-white" : mobile ? "bg-surface ring-1 ring-line" : "text-ink/80 hover:bg-brand-50",
        )}
      >
        <Icon aria-hidden className={mobile ? "size-4" : "size-5"} />
        {t(`nav.${i.key}`)}
      </Link>
    );
  };

  return (
    <div className="flex min-h-dvh bg-canvas">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-line bg-surface p-4 lg:flex">
        <Link href="/admin" className="mb-1 px-2">
          <Logo variant="lockup" className="h-10" />
        </Link>
        <p className="mb-4 px-2 text-xs font-semibold text-accent-700">{t("title")}</p>
        <nav aria-label={t("title")} className="flex-1 space-y-1 overflow-y-auto">{items.map((i) => link(i))}</nav>
        <Link href="/app" className={buttonClass("ghost", "md", "justify-start")}>
          <ArrowRightLeft aria-hidden className="size-4" />
          {t("backToApp")}
        </Link>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 space-y-2 border-b border-line bg-surface/95 px-4 pb-2 pt-safe backdrop-blur lg:hidden">
          <div className="flex h-12 items-center justify-between">
            <p className="font-bold">{t("title")}</p>
            <Link href="/app" className="text-sm font-medium text-brand-700">{t("backToApp")}</Link>
          </div>
          <nav aria-label={t("title")} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">{items.map((i) => link(i, true))}</nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-5 sm:px-6 lg:px-10 lg:pt-8">
          {allowed ? (
            children
          ) : (
            <Card className="py-10 text-center">
              <Link href={items[0]!.href} className={buttonClass("primary")}>{t(`nav.${items[0]!.key}`)}</Link>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

/** رابط اللوحة في «المزيد» (يظهر لمن له دور إداري فقط). */
export function AdminLink() {
  const t = useTranslations("admin");
  const roles = useRoles();
  if (!roles.length) return null;
  return (
    <Link href="/admin" className="flex min-h-14 items-center gap-4 rounded-card bg-surface px-4 shadow-card transition-colors hover:bg-brand-50">
      <span className="grid size-10 place-items-center rounded-xl bg-accent-100 text-accent-700">
        <Gauge aria-hidden className="size-5" />
      </span>
      <span className="flex-1 font-medium">{t("link")}</span>
    </Link>
  );
}
