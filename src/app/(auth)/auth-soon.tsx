import { getTranslations } from "next-intl/server";
import { LinkButton } from "@/components/ui/button";

/** محتوى مؤقت لصفحتي الدخول والتسجيل حتى تُبنى المصادقة في Phase 2. */
export async function AuthSoon({ titleKey }: { titleKey: "loginTitle" | "registerTitle" }) {
  const t = await getTranslations("auth");

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold">{t(titleKey)}</h1>
      <p className="mt-3 text-muted">{t("soon")}</p>
      <LinkButton href="/" variant="secondary" className="mt-6">
        {t("backHome")}
      </LinkButton>
    </div>
  );
}
