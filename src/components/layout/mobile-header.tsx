import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";

export async function MobileHeader() {
  const t = await getTranslations("nav");

  return (
    <header className="sticky top-0 z-20 print:hidden border-b border-line bg-surface/95 pt-safe backdrop-blur lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/app" aria-label={t("today")}>
          <Logo variant="lockup" className="h-9" priority />
        </Link>
        {/* مكان الإشعارات وصورة الحساب — Phase 2 */}
      </div>
    </header>
  );
}
