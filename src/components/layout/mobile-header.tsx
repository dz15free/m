import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { InstallButton } from "@/features/pwa/install-button";

export async function MobileHeader() {
  const t = await getTranslations("nav");

  return (
    <header className="sticky top-0 z-20 print:hidden border-b border-line bg-surface/95 pt-safe backdrop-blur lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/app" aria-label={t("today")}>
          <Logo variant="lockup" className="h-9" priority />
        </Link>
        <div className="flex items-center gap-1">
          <InstallButton compact />
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
