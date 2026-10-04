import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { ActionHandler } from "@/features/auth/action-handler";
import { parseActionLink } from "@/features/auth/action-link";

/* رابط الإجراءات في قوالب Firebase (Customize action URL):
   https://prof.baczone.app/auth/action — تأكيد البريد، كلمة مرور جديدة، استعادة البريد.
   خارج تخطيط (auth) عمدًا: الأستاذ الداخل يؤكّد بريده هنا دون أن يُحوَّل. */

export async function generateMetadata() {
  const t = await getTranslations("authAction");
  return { title: t("pageTitle"), robots: { index: false, follow: false } };
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const link = parseActionLink(await searchParams);
  const t = await getTranslations("brand");
  return (
    <div className="flex min-h-dvh flex-col items-center bg-linear-to-b from-brand-50 to-canvas px-4 pb-safe pt-safe">
      <div className="flex w-full max-w-md flex-1 flex-col justify-center py-8">
        <Link href="/" aria-label={t("name")} className="mx-auto">
          <Logo variant="full" className="h-28 sm:h-36" sizes="(min-width: 640px) 144px, 112px" priority />
        </Link>
        <div className="mt-6 rounded-card bg-surface p-6 shadow-card sm:p-8">
          <ActionHandler link={link} />
        </div>
        <div className="mt-6 flex justify-center">
          <LocaleSwitcher />
        </div>
      </div>
    </div>
  );
}
