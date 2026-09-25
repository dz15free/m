import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { AuthProvider } from "@/features/auth/auth-provider";
import { RedirectIfSignedIn, Splash } from "@/features/auth/gates";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("brand");

  return (
    <AuthProvider>
      <Suspense fallback={<Splash />}>
        <RedirectIfSignedIn>
          <div className="flex min-h-dvh flex-col items-center bg-linear-to-b from-brand-50 to-canvas px-4 pb-safe pt-safe">
            <div className="flex w-full max-w-md flex-1 flex-col justify-center py-8">
              <Link href="/" aria-label={t("name")} className="mx-auto">
                <Logo variant="full" className="h-28 sm:h-36" priority />
              </Link>
              <div className="mt-6 rounded-card bg-surface p-6 shadow-card sm:p-8">{children}</div>
              <div className="mt-6 flex justify-center">
                <LocaleSwitcher />
              </div>
            </div>
          </div>
        </RedirectIfSignedIn>
      </Suspense>
    </AuthProvider>
  );
}
