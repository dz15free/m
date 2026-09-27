"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CalendarCheck2, Check, FileText, LoaderCircle, Lock, MailCheck, MessageCircle, NotebookPen, ShieldCheck, Sparkles, Users } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { openSupport } from "@/features/support/repo";
import { FeedbackForm } from "./feedback-form";
import { startTrial, TrialError, useBilling, useRefreshBilling } from "./repo";

/** صفحات تبقى مفتوحة دائمًا: الحساب والإعدادات والاشتراك نفسه. */
const OPEN_PATHS = ["/app/settings", "/app/more", "/app/billing"];

/* بوابة الوصول (للعرض فقط؛ المنع الفعلي في قواعد Firestore والخادم):
   - أول دخول بعد الإعداد ⇐ تبدأ التجربة المجانية تلقائيًا (بعد تأكيد البريد).
   - تجربة أو اشتراك ساريان ⇐ التطبيق كما هو.
   - غير ذلك ⇐ صفحة الاشتراك مع «رأيك في المنصة»، والبيانات محفوظة كما هي. */
export function AccessGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const billing = useBilling();
  const pathname = usePathname();
  const staff = auth.status === "signedIn" && auth.roles.length > 0;

  // أثناء التحميل (أو دون اتصال) نعرض الصفحة: القواعد تمنع الكتابة إن لزم
  if (!billing.ready || staff || billing.access !== "locked" || OPEN_PATHS.some((p) => pathname.startsWith(p))) return <>{children}</>;
  if (billing.trialAvailable) {
    const verified = auth.status === "signedIn" && auth.user.emailVerified;
    return verified ? <AutoTrial /> : <VerifyToStart days={billing.trialDays} />;
  }
  return <Paywall trialUsed={billing.effective.trialUsed} />;
}

function AutoTrial() {
  const t = useTranslations("access");
  const refresh = useRefreshBilling();
  const auth = useAuth();
  const uid = auth.status === "signedIn" ? auth.user.uid : "";
  const start = useQuery({
    queryKey: ["autoTrial", uid],
    queryFn: async () => {
      await startTrial();
      await refresh();
      return true;
    },
    retry: (n, e) => n < 2 && e instanceof TrialError && e.reason === "network",
    staleTime: Infinity,
    gcTime: Infinity,
  });
  if (start.isError) {
    const reason = start.error instanceof TrialError ? start.error.reason : "network";
    return (
      <Panel icon={Sparkles} title={t("startFailed")}>
        <p className="text-muted">{t(`trialErrors.${reason}`)}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => start.refetch()} className={buttonClass("primary")}>{t("retry")}</button>
          <button type="button" onClick={() => openSupport()} className={buttonClass("secondary")}>
            <MessageCircle aria-hidden className="size-4" />
            {t("contact")}
          </button>
        </div>
      </Panel>
    );
  }
  return (
    <div role="status" className="grid place-items-center gap-3 py-16 text-center">
      <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      <p className="font-medium">{t("starting")}</p>
    </div>
  );
}

function VerifyToStart({ days }: { days: number }) {
  const t = useTranslations("access");
  return (
    <Panel icon={MailCheck} title={t("verifyTitle", { n: days })}>
      <p className="leading-relaxed text-muted">{t("verifyBody")}</p>
    </Panel>
  );
}

function Paywall({ trialUsed }: { trialUsed: boolean }) {
  const t = useTranslations("access");
  const perks = [
    { icon: NotebookPen, key: "notebook" },
    { icon: FileText, key: "lessons" },
    { icon: CalendarCheck2, key: "attendance" },
    { icon: Users, key: "documents" },
  ] as const;
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <Panel icon={Lock} title={trialUsed ? t("endedTitle") : t("lockedTitle")}>
        <p className="leading-relaxed text-muted">{t("endedBody")}</p>
        <ul className="grid gap-2 text-start sm:grid-cols-2">
          {perks.map(({ icon: Icon, key }) => (
            <li key={key} className="flex items-start gap-2 rounded-xl bg-canvas p-3 text-sm">
              <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-700" />
              {t(`perks.${key}`)}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/app/billing" className={buttonClass("primary", "lg")}>
            <Check aria-hidden className="size-4" />
            {t("subscribe")}
          </Link>
          <button type="button" onClick={() => openSupport(t("supportText"))} className={buttonClass("secondary", "lg")}>
            <MessageCircle aria-hidden className="size-4" />
            {t("contact")}
          </button>
        </div>
        <p className="flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-start text-sm text-brand-900">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("dataSafe")}
        </p>
      </Panel>
      <FeedbackForm context={trialUsed ? "trialEnd" : "general"} />
    </div>
  );
}

function Panel({ icon: Icon, title, children }: { icon: typeof Lock; title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-2xl space-y-4 rounded-card bg-surface p-6 text-center shadow-card">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-50 text-brand-700">
        <Icon aria-hidden className="size-8" />
      </span>
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
    </section>
  );
}
