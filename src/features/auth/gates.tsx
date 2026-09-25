"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/logo";
import { useAuth } from "./auth-provider";

/** شاشة انتظار قصيرة بالشعار أثناء قراءة الجلسة (عادةً أقل من ثانية، من الكاش المحلي). */
export function Splash() {
  const t = useTranslations("auth");
  return (
    <div role="status" className="grid min-h-dvh place-items-center bg-surface">
      <Logo variant="mark" className="h-16 animate-pulse" priority />
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
}

/** يحرس مساحة الأستاذ: غير المسجّل يُحوَّل إلى الدخول ثم يعود إلى الصفحة نفسها،
 *  ومن لم يُكمل معالج البداية يُحوَّل إليه.
 *  (هذه راحة للواجهة فقط؛ حماية البيانات الحقيقية في قواعد Firestore والخادم.) */
export function RequireAuth({ children, onboarding = false }: { children: React.ReactNode; onboarding?: boolean }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const onboardingDone = auth.status === "signedIn" ? auth.onboardingDone : null;

  useEffect(() => {
    if (auth.status === "signedOut") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (onboardingDone === false && !onboarding) {
      router.replace("/onboarding");
    } else if (onboardingDone === true && onboarding) {
      router.replace("/app");
    }
  }, [auth.status, onboardingDone, onboarding, pathname, router]);

  const ready = auth.status === "signedIn" && onboardingDone === !onboarding;
  if (!ready) return <Splash />;
  return <>{children}</>;
}

/** صفحات الدخول/التسجيل: المسجّل مسبقًا يُحوَّل مباشرة إلى وجهته. */
export function RedirectIfSignedIn({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));

  useEffect(() => {
    if (auth.status === "signedIn") router.replace(next);
  }, [auth.status, next, router]);

  if (auth.status === "signedIn") return <Splash />;
  return <>{children}</>;
}

/** يقبل مسارات داخلية فقط، لمنع إعادة التوجيه إلى موقع خارجي (open redirect). */
export function safeNext(value: string | null): string {
  if (!value || !(value.startsWith("/app") || value.startsWith("/admin")) || value.startsWith("//")) return "/app";
  return value;
}
