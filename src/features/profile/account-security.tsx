"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BadgeCheck, KeyRound, LoaderCircle, Mail, MailWarning, X } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import { getFirebase } from "@/lib/firebase/client";
import { addPassword, changeEmail, changePassword, currentProvider } from "@/features/auth/auth-service";
import { authErrorKey } from "@/features/auth/errors";

type Dialog = "email" | "password" | null;

/* الحساب وتسجيل الدخول: البريد الحالي، تغييره (برابط تأكيد على البريد الجديد)، وتغيير كلمة المرور
   — أو إضافتها لمن يدخل بـ Google. كل عملية تطلب كلمة المرور الحالية (أو نافذة Google) أولًا. */
export function AccountSecurity() {
  const t = useTranslations("settings.account");
  const [open, setOpen] = useState<Dialog>(null);
  const [done, setDone] = useState<string | null>(null);
  const user = getFirebase().auth.currentUser;
  const provider = currentProvider();
  if (!user) return null;

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-bold">{t("title")}</h2>
      <div className="flex flex-wrap items-center gap-3">
        <Mail aria-hidden className="size-5 shrink-0 text-brand-700" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">{t("email")}</p>
          <p dir="ltr" className="truncate text-start font-semibold">{user.email}</p>
        </div>
        {user.emailVerified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800">
            <BadgeCheck aria-hidden className="size-3.5" />
            {t("verified")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
            <MailWarning aria-hidden className="size-3.5" />
            {t("notVerified")}
          </span>
        )}
      </div>
      <p className="text-sm text-muted">{provider === "google" ? t("googleNote") : t("passwordNote")}</p>
      {done && (
        <p role="status" className="rounded-2xl bg-green-50 p-3 text-sm text-green-900">
          {done}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {provider === "password" && (
          <button type="button" onClick={() => setOpen("email")} className={buttonClass("secondary")}>
            <Mail aria-hidden className="size-4" />
            {t("changeEmail")}
          </button>
        )}
        <button type="button" onClick={() => setOpen("password")} className={buttonClass("secondary")}>
          <KeyRound aria-hidden className="size-4" />
          {provider === "google" ? t("addPassword") : t("changePassword")}
        </button>
      </div>
      {open && (
        <Portal>
          {open === "email" ? (
            <EmailDialog onClose={() => setOpen(null)} onDone={(email) => setDone(t("emailSent", { email }))} />
          ) : (
            <PasswordDialog google={provider === "google"} onClose={() => setOpen(null)} onDone={() => setDone(provider === "google" ? t("passwordAdded") : t("passwordChanged"))} />
          )}
        </Portal>
      )}
    </Card>
  );
}

function Shell({ title, busy, onClose, onSubmit, children }: { title: string; busy: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void; children: React.ReactNode }) {
  const t = useTranslations("settings.account");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6" onClick={busy ? undefined : onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="acc-title"
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full space-y-4 rounded-t-3xl bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-float sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="acc-title" className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label={t("cancel")} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-canvas">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        {children}
      </form>
    </div>
  );
}

const input = "min-h-11 w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand-600";

function Field({ label, hint, ...props }: { label: string; hint?: string } & React.ComponentProps<"input">) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <input dir="ltr" className={input} {...props} />
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Actions({ busy, disabled, label, onClose }: { busy: boolean; disabled: boolean; label: string; onClose: () => void }) {
  const t = useTranslations("settings.account");
  return (
    <div className="flex gap-2">
      <button type="submit" disabled={disabled || busy} className={buttonClass("primary", "md", "flex-1")}>
        {busy && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
        {label}
      </button>
      <button type="button" onClick={onClose} disabled={busy} className={buttonClass("ghost", "md")}>
        {t("cancel")}
      </button>
    </div>
  );
}

function EmailDialog({ onClose, onDone }: { onClose: () => void; onDone: (email: string) => void }) {
  const t = useTranslations("settings.account");
  const te = useTranslations("auth.errors");
  const locale = useLocale() as Locale;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = getFirebase().auth.currentUser?.email ?? "";
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.trim().toLowerCase() !== current.toLowerCase() && password.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await changeEmail(password, email, locale);
      onDone(email.trim());
      onClose();
    } catch (err) {
      setError(te(authErrorKey(err)));
      setBusy(false);
    }
  }

  return (
    <Shell title={t("changeEmail")} busy={busy} onClose={onClose} onSubmit={submit}>
      <p className="text-sm text-muted">{t("emailHow")}</p>
      <Field label={t("newEmail")} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Field label={t("currentPassword")} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Actions busy={busy} disabled={!valid} label={t("sendLink")} onClose={onClose} />
    </Shell>
  );
}

function PasswordDialog({ google, onClose, onDone }: { google: boolean; onClose: () => void; onDone: () => void }) {
  const t = useTranslations("settings.account");
  const te = useTranslations("auth.errors");
  const locale = useLocale() as Locale;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mismatch = again.length > 0 && next !== again;
  const valid = (google || current.length > 0) && next.length >= 8 && next === again && next !== current;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      if (google) await addPassword(next, locale);
      else await changePassword(current, next, locale);
      onDone();
      onClose();
    } catch (err) {
      setError(te(authErrorKey(err)));
      setBusy(false);
    }
  }

  return (
    <Shell title={google ? t("addPassword") : t("changePassword")} busy={busy} onClose={onClose} onSubmit={submit}>
      {google ? (
        <p className="text-sm text-muted">{t("addPasswordHow")}</p>
      ) : (
        <Field label={t("currentPassword")} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      )}
      <Field label={t("newPassword")} hint={t("passwordRule")} type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
      <Field label={t("confirmPassword")} type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required />
      {mismatch && <p className="text-sm text-amber-800">{t("mismatch")}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Actions busy={busy} disabled={!valid} label={t("save")} onClose={onClose} />
    </Shell>
  );
}
