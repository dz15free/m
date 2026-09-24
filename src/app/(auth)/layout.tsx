import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("brand");

  return (
    <div className="flex min-h-dvh flex-col items-center bg-linear-to-b from-brand-50 to-canvas px-4 pb-safe pt-safe">
      <div className="flex w-full max-w-md flex-1 flex-col justify-center py-10">
        <Link href="/" aria-label={t("name")} className="mx-auto">
          <Logo variant="full" className="h-36 sm:h-44" priority />
        </Link>
        <div className="mt-8 rounded-card bg-surface p-6 shadow-card sm:p-8">{children}</div>
        <div className="mt-6 flex justify-center">
          <LocaleSwitcher />
        </div>
      </div>
    </div>
  );
}
