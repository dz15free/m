"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { authErrorKey, type AuthErrorKey } from "./errors";
import { registerWithEmail, resetPassword, signInWithEmail, signInWithGoogle } from "./auth-service";

/* نماذج الدخول والتسجيل والاستعادة. بعد النجاح لا نوجّه يدويًا:
   مستمع الجلسة يلتقط الدخول و RedirectIfSignedIn ينقل إلى الوجهة. */

function useSubmit() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AuthErrorKey | null>(null);

  async function run(action: () => Promise<void>) {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(authErrorKey(e));
    } finally {
      setPending(false);
    }
  }

  return { pending, error, run };
}

function ErrorMessage({ error }: { error: AuthErrorKey | null }) {
  const t = useTranslations("auth.errors");
  if (!error) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      {t(error)}
    </p>
  );
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full")}>
      {pending && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
      {label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-5">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function GoogleButton() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const { pending, error, run } = useSubmit();

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => signInWithGoogle(locale))}
        className={buttonClass("secondary", "lg", "w-full text-ink")}
      >
        {pending ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : <GoogleIcon />}
        {t("google")}
      </button>
      <ErrorMessage error={error} />
    </div>
  );
}

function Divider() {
  const t = useTranslations("auth");
  return (
    <div className="flex items-center gap-3 text-sm text-muted" aria-hidden>
      <span className="h-px flex-1 bg-line" />
      {t("or")}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-1.5 text-muted">{subtitle}</p>
    </div>
  );
}

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const { pending, error, run } = useSubmit();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    run(() => signInWithEmail(String(data.get("email")), String(data.get("password")), locale));
  }

  return (
    <div className="space-y-6">
      <Header title={t("loginTitle")} subtitle={t("loginSubtitle")} />
      <GoogleButton />
      <Divider />
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t("email")} name="email" type="email" autoComplete="email" inputMode="email" dir="ltr" required />
        <Field label={t("password")} name="password" type="password" autoComplete="current-password" dir="ltr" required />
        <div className="text-end">
          <Link href="/reset" className="text-sm font-medium text-brand-700 hover:underline">
            {t("forgot")}
          </Link>
        </div>
        <ErrorMessage error={error} />
        <SubmitButton pending={pending} label={t("submitLogin")} />
      </form>
      <p className="text-center text-sm text-muted">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-semibold text-brand-700 hover:underline">
          {t("toRegister")}
        </Link>
      </p>
    </div>
  );
}

export function RegisterForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const { pending, error, run } = useSubmit();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    run(() =>
      registerWithEmail(String(data.get("name")), String(data.get("email")), String(data.get("password")), locale),
    );
  }

  return (
    <div className="space-y-6">
      <Header title={t("registerTitle")} subtitle={t("registerSubtitle")} />
      <GoogleButton />
      <Divider />
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t("name")} name="name" autoComplete="name" maxLength={80} required />
        <Field label={t("email")} name="email" type="email" autoComplete="email" inputMode="email" dir="ltr" required />
        <Field
          label={t("password")}
          hint={t("passwordHint")}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          dir="ltr"
          required
        />
        <ErrorMessage error={error} />
        <SubmitButton pending={pending} label={t("submitRegister")} />
        <p className="text-center text-xs text-muted">{t("terms")}</p>
      </form>
      <p className="text-center text-sm text-muted">
        {t("hasAccount")}{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          {t("toLogin")}
        </Link>
      </p>
    </div>
  );
}

export function ResetForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const { pending, error, run } = useSubmit();
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email"));
    run(async () => {
      try {
        await resetPassword(email, locale);
      } catch (err) {
        // لا نكشف هل البريد مسجّل أم لا
        if (authErrorKey(err) !== "invalidCredentials") throw err;
      }
      setSent(true);
    });
  }

  return (
    <div className="space-y-6">
      <Header title={t("resetTitle")} subtitle={t("resetSubtitle")} />
      {sent ? (
        <p role="status" className="flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
          <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("resetSent")}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label={t("email")} name="email" type="email" autoComplete="email" inputMode="email" dir="ltr" required />
          <ErrorMessage error={error} />
          <SubmitButton pending={pending} label={t("submitReset")} />
        </form>
      )}
      <p className="text-center text-sm">
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </div>
  );
}
