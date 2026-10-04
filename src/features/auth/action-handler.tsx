"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { applyActionCode, checkActionCode, confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { CircleAlert, CircleCheck, KeyRound, LoaderCircle, MailCheck } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { getFirebase } from "@/lib/firebase/client";
import type { Locale } from "@/i18n/config";
import { actionErrorKey, type ActionErrorKey, type ActionLink } from "./action-link";
import { resetPassword, signInWithEmail } from "./auth-service";

/* صفحة روابط رسائل البريد (تأكيد البريد، كلمة مرور جديدة، استعادة البريد).
   الرمز يُستهلك مرة واحدة: نحفظ الوعد حسب الرمز كي لا يُرسل مرتين (StrictMode / إعادة التركيب). */
const once = new Map<string, Promise<unknown>>();
function runOnce<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (!once.has(key)) once.set(key, fn());
  return once.get(key) as Promise<T>;
}

type State =
  | { kind: "loading" }
  | { kind: "error"; error: ActionErrorKey }
  | { kind: "verified"; signedIn: boolean }
  | { kind: "reset"; email: string }
  | { kind: "recovered"; email: string };

export function ActionHandler({ link }: { link: ActionLink }) {
  const t = useTranslations("authAction");
  const [state, setState] = useState<State>(link ? { kind: "loading" } : { kind: "error", error: "invalid" });

  useEffect(() => {
    if (!link) return;
    const { auth } = getFirebase();
    const { mode, oobCode } = link;
    let alive = true;
    const set = (s: State) => alive && setState(s);
    const task =
      mode === "resetPassword"
        ? runOnce(oobCode, () => verifyPasswordResetCode(auth, oobCode)).then((email) => set({ kind: "reset", email: String(email) }))
        : mode === "recoverEmail"
          ? runOnce(oobCode, async () => {
              const info = await checkActionCode(auth, oobCode);
              await applyActionCode(auth, oobCode);
              return info.data.email ?? "";
            }).then((email) => set({ kind: "recovered", email: String(email) }))
          : runOnce(oobCode, async () => {
              await applyActionCode(auth, oobCode);
              // إن كان الأستاذ داخلًا على هذا الجهاز: نحدّث حالته فيختفي شريط «أكّد بريدك»
              await auth.authStateReady();
              const user = auth.currentUser;
              if (user) {
                await user.reload().catch(() => {});
                await user.getIdToken(true).catch(() => {});
              }
              return !!user;
            }).then((signedIn) => set({ kind: "verified", signedIn: Boolean(signedIn) }));
    task.catch((e) => set({ kind: "error", error: actionErrorKey(e) }));
    return () => {
      alive = false;
    };
  }, [link]);

  if (state.kind === "loading") {
    return (
      <div role="status" className="grid place-items-center gap-3 py-10 text-center">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
        <p className="font-medium">{t("checking")}</p>
      </div>
    );
  }
  if (state.kind === "error") return <ActionError error={state.error} mode={link?.mode} />;
  if (state.kind === "reset") return <NewPassword email={state.email} oobCode={link!.oobCode} />;
  if (state.kind === "recovered") return <Recovered email={state.email} />;
  return (
    <Result icon={MailCheck} title={link?.mode === "verifyAndChangeEmail" ? t("changedTitle") : t("verifiedTitle")} body={t("verifiedBody")}>
      <Link href={state.signedIn ? "/app" : "/login"} className={buttonClass("primary", "lg", "w-full")}>
        {state.signedIn ? t("toApp") : t("toLogin")}
      </Link>
    </Result>
  );
}

function Result({ icon: Icon, title, body, tone = "ok", children }: { icon: typeof MailCheck; title: string; body: string; tone?: "ok" | "error"; children?: React.ReactNode }) {
  return (
    <div className="space-y-5 text-center">
      <span className={`mx-auto grid size-16 place-items-center rounded-full ${tone === "ok" ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-700"}`}>
        <Icon aria-hidden className="size-8" />
      </span>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="leading-relaxed text-muted">{body}</p>
      </div>
      {children}
    </div>
  );
}

function ActionError({ error, mode }: { error: ActionErrorKey; mode?: string }) {
  const t = useTranslations("authAction");
  const reset = mode === "resetPassword";
  return (
    <Result icon={CircleAlert} tone="error" title={t(`errors.${error}.title`)} body={t(`errors.${error}.body`)}>
      <div className="space-y-2">
        <Link href={reset ? "/reset" : "/login"} className={buttonClass("primary", "lg", "w-full")}>
          {reset ? t("newResetLink") : t("toLogin")}
        </Link>
        {!reset && error !== "network" && <p className="text-sm text-muted">{t("resendHint")}</p>}
      </div>
    </Result>
  );
}

function NewPassword({ email, oobCode }: { email: string; oobCode: string }) {
  const t = useTranslations("authAction");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ActionErrorKey | "mismatch" | "short" | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("short");
    if (password !== confirm) return setError("mismatch");
    setPending(true);
    setError(null);
    try {
      await confirmPasswordReset(getFirebase().auth, oobCode, password);
    } catch (err) {
      setError(actionErrorKey(err));
      setPending(false);
      return;
    }
    // ندخله مباشرة بكلمة المرور الجديدة؛ إن تعذّر يبقى زر الدخول
    try {
      await signInWithEmail(email, password, locale);
      router.replace("/app");
    } catch {
      setDone(true);
      setPending(false);
    }
  }

  if (done) {
    return (
      <Result icon={CircleCheck} title={t("resetDoneTitle")} body={t("resetDoneBody")}>
        <Link href="/login" className={buttonClass("primary", "lg", "w-full")}>{t("toLogin")}</Link>
      </Result>
    );
  }
  const message =
    error === "short" ? t("short") : error === "mismatch" ? t("mismatch") : error ? t(`errors.${error}.body`) : null;
  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="space-y-2 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-50 text-brand-700">
          <KeyRound aria-hidden className="size-8" />
        </span>
        <h1 className="text-2xl font-bold">{t("resetTitle")}</h1>
        <p className="text-muted">
          {t("resetFor")} <bdi className="font-medium text-ink" dir="ltr">{email}</bdi>
        </p>
      </div>
      <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
      <Field label={t("newPassword")} type="password" autoComplete="new-password" hint={t("hint")} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      <Field label={t("confirmPassword")} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      {message && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {message}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
        {pending && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
        {t("save")}
      </button>
    </form>
  );
}

function Recovered({ email }: { email: string }) {
  const t = useTranslations("authAction");
  const locale = useLocale() as Locale;
  const [sent, setSent] = useState<"idle" | "busy" | "sent" | "failed">("idle");
  return (
    <Result icon={CircleCheck} title={t("recoveredTitle")} body={t("recoveredBody", { email })}>
      <div className="space-y-2">
        {sent === "sent" ? (
          <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-900">{t("resetSent")}</p>
        ) : (
          <button
            type="button"
            disabled={sent === "busy" || !email}
            onClick={async () => {
              setSent("busy");
              try {
                await resetPassword(email, locale);
                setSent("sent");
              } catch {
                setSent("failed");
              }
            }}
            className={buttonClass("primary", "lg", "w-full")}
          >
            {sent === "busy" && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
            {t("sendReset")}
          </button>
        )}
        {sent === "failed" && <p role="alert" className="text-sm text-red-700">{t("errors.network.body")}</p>}
        <Link href="/login" className={buttonClass("ghost", "md", "w-full")}>{t("toLogin")}</Link>
      </div>
    </Result>
  );
}
