"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LogOut, MailCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "./auth-provider";
import { resendVerification, signOut } from "./auth-service";

/** تذكير لطيف بتأكيد البريد — لا يمنع العمل؛ التأكيد مطلوب لاحقًا للدفع والتجربة فقط. */
export function VerifyEmailBanner() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const auth = useAuth();
  const [state, setState] = useState<"idle" | "sent" | "checking">("idle");

  if (auth.status !== "signedIn" || auth.user.emailVerified || !auth.user.email) return null;
  const { user } = auth;

  return (
    <div role="status" className="mb-5 flex flex-wrap items-center gap-3 print:hidden rounded-card bg-accent-100 p-4 text-sm">
      <MailCheck aria-hidden className="size-5 shrink-0 text-accent-700" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t("verifyTitle")}</p>
        <p className="text-muted">
          {t("verifyBody")}{" "}
          <bdi dir="ltr" className="font-medium text-ink">
            {user.email}
          </bdi>
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={state !== "idle"}
          onClick={async () => {
            await resendVerification(locale).catch(() => {});
            setState("sent");
          }}
          className="min-h-10 rounded-full px-4 font-semibold text-accent-700 hover:bg-white/60 disabled:opacity-60"
        >
          {state === "sent" ? t("verifySent") : t("verifyResend")}
        </button>
        <button
          type="button"
          onClick={async () => {
            setState("checking");
            // إعادة تحميل الحساب ثم تحديث الرمز: يُطلق onIdTokenChanged فيختفي الشريط
            await user.reload().catch(() => {});
            await user.getIdToken(true).catch(() => {});
            setState("idle");
          }}
          className="min-h-10 rounded-full bg-surface px-4 font-semibold text-ink shadow-card"
        >
          {t("verifyDone")}
        </button>
      </div>
    </div>
  );
}

/** بطاقة الحساب: الاسم والبريد وتسجيل الخروج. */
export function AccountCard({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("auth");
  const auth = useAuth();
  if (auth.status !== "signedIn") return null;

  const { displayName, email } = auth.user;
  const initial = (displayName || email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className={cn("flex items-center gap-3", !compact && "rounded-card bg-surface p-4 shadow-card")}>
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-800"
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        {displayName && <p className="truncate font-semibold">{displayName}</p>}
        <p className="truncate text-sm text-muted" dir="ltr">
          {email}
        </p>
      </div>
      <button
        type="button"
        onClick={async () => {
          if ((await signOut()) === "pending" && window.confirm(t("signOutPending"))) await signOut({ force: true });
        }}
        aria-label={t("signOut")}
        title={t("signOut")}
        className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-700"
      >
        <LogOut aria-hidden className="size-5 rtl:-scale-x-100" />
      </button>
    </div>
  );
}

/** التحية باسم الأستاذ (الاسم الأول فقط). */
export function Greeting({ className }: { className?: string }) {
  const t = useTranslations("today");
  const auth = useAuth();
  const first = auth.status === "signedIn" ? auth.user.displayName?.trim().split(/\s+/)[0] : undefined;
  return <h1 className={className}>{first ? t("greetingName", { name: first }) : t("greeting")}</h1>;
}
