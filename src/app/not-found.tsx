import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-canvas p-6 text-center">
      <div className="max-w-sm space-y-4">
        <Logo variant="mark" className="mx-auto h-16" />
        <p className="text-5xl font-bold text-brand-700" aria-hidden>404</p>
        <h1 className="text-2xl font-bold">{t("notFoundTitle")}</h1>
        <p className="text-muted">{t("notFoundBody")}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <LinkButton href="/app">{t("goApp")}</LinkButton>
          <LinkButton href="/" variant="ghost">{t("goHome")}</LinkButton>
        </div>
      </div>
    </main>
  );
}
