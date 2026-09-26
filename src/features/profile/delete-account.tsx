"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LoaderCircle, Trash2, X } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { buttonClass } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { currentProvider, deleteMyAccount } from "@/features/auth/auth-service";

/* منطقة الخطر في الإعدادات: حذف الحساب وكل البيانات نهائيًا، بتأكيد مكتوب وإعادة مصادقة. */
export function DeleteAccount() {
  const t = useTranslations("settings.delete");
  const [open, setOpen] = useState(false);
  return (
    <section className="space-y-3 rounded-card border border-red-200 bg-red-50/40 p-4">
      <h2 className="font-bold text-red-800">{t("title")}</h2>
      <p className="text-sm text-muted">{t("body")}</p>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-red-300 bg-surface px-5 font-semibold text-red-700 hover:bg-red-50">
        <Trash2 aria-hidden className="size-4" />
        {t("button")}
      </button>
      {open && (
        <Portal>
          <Dialog onClose={() => setOpen(false)} />
        </Portal>
      )}
    </section>
  );
}

function Dialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations("settings.delete");
  const locale = useLocale() as Locale;
  const [word, setWord] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "error" | "wrongPassword" | "admin">("idle");
  const provider = currentProvider();
  const ok = word.trim() === t("word") && (provider !== "password" || password.length > 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ok) return;
    setState("busy");
    try {
      await deleteMyAccount(password, locale);
    } catch (error) {
      const code = (error as { code?: string; message?: string }).code ?? (error as Error).message;
      setState(code === "admin" ? "admin" : /wrong-password|invalid-credential|invalid-login/.test(code ?? "") ? "wrongPassword" : "error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6" onClick={state === "busy" ? undefined : onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="del-title"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full space-y-4 rounded-t-3xl bg-surface p-6 pb-safe shadow-float sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="del-title" className="text-lg font-bold text-red-800">{t("confirmTitle")}</h2>
          <button type="button" onClick={onClose} aria-label={t("cancel")} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-canvas">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <ul className="list-disc space-y-1 ps-5 text-sm">
          <li>{t("lose1")}</li>
          <li>{t("lose2")}</li>
          <li>{t("lose3")}</li>
        </ul>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">{t("typeWord", { word: t("word") })}</span>
          <input value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" className="min-h-11 w-full rounded-xl border border-line px-3 outline-none focus:border-red-600" />
        </label>
        {provider === "password" ? (
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">{t("password")}</span>
            <input type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="min-h-11 w-full rounded-xl border border-line px-3 outline-none focus:border-red-600" />
          </label>
        ) : (
          <p className="text-sm text-muted">{t("google")}</p>
        )}
        {state !== "idle" && state !== "busy" && <p role="alert" className="text-sm text-red-700">{t(state)}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={!ok || state === "busy"} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-red-700 px-5 font-semibold text-white hover:bg-red-800 disabled:opacity-50">
            {state === "busy" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Trash2 aria-hidden className="size-4" />}
            {t("confirm")}
          </button>
          <button type="button" onClick={onClose} disabled={state === "busy"} className={buttonClass("ghost", "md")}>{t("cancel")}</button>
        </div>
      </form>
    </div>
  );
}
