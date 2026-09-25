"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Download, EllipsisVertical, Share, SquarePlus, X } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils/cn";
import { getInstallState, initInstallStore, promptInstall, subscribe, type InstallState } from "./install-store";

let initialized = false;

/** يُركَّب مرة واحدة في الجذر: يلتقط حدث التثبيت ويسجّل عامل الخدمة. */
export function PwaInit() {
  useEffect(() => {
    if (initialized) return;
    initialized = true;
    initInstallStore();
  }, []);
  return null;
}

/* زر «تثبيت التطبيق»: على Android/Chrome يفتح نافذة التثبيت مباشرة، وعلى iPhone
   يعرض الخطوات (Safari لا يسمح بالتثبيت برمجيًا). يختفي إن كان التطبيق مثبّتًا. */
export function InstallButton({ compact = false, className }: { compact?: boolean; className?: string }) {
  const t = useTranslations("pwa");
  const state = useSyncExternalStore<InstallState>(subscribe, getInstallState, () => "installed");
  const [guide, setGuide] = useState<"ios" | "manual" | null>(null);

  if (state === "installed") return null;

  async function onClick() {
    if (state === "prompt") {
      await promptInstall();
      return;
    }
    setGuide(state === "ios" ? "ios" : "manual");
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={onClick}
          className={cn("inline-flex min-h-10 items-center gap-1.5 rounded-full bg-brand-50 px-3 text-sm font-semibold text-brand-800 hover:bg-brand-100", className)}
        >
          <Download aria-hidden className="size-4" />
          {t("installShort")}
        </button>
      ) : (
        <button type="button" onClick={onClick} className={buttonClass("secondary", "md", cn("w-full", className))}>
          <Download aria-hidden className="size-4" />
          {t("install")}
        </button>
      )}
      {guide && <Guide kind={guide} onClose={() => setGuide(null)} />}
    </>
  );
}

function Guide({ kind, onClose }: { kind: "ios" | "manual"; onClose: () => void }) {
  const t = useTranslations("pwa");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const steps =
    kind === "ios"
      ? [
          { icon: Share, text: t("ios1") },
          { icon: SquarePlus, text: t("ios2") },
          { icon: Download, text: t("ios3") },
        ]
      : [
          { icon: EllipsisVertical, text: t("manual1") },
          { icon: Download, text: t("manual2") },
        ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 print:hidden sm:items-center sm:p-6" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full space-y-4 rounded-t-3xl bg-surface p-6 pb-safe shadow-float sm:max-w-sm sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo variant="mark" className="h-12" />
            <div>
              <h2 id="install-title" className="text-lg font-bold">{t("guideTitle")}</h2>
              <p className="text-sm text-muted">{t("guideBody")}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t("close")} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-canvas">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <ol className="space-y-3">
          {steps.map(({ icon: Icon, text }, i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white">{i + 1}</span>
              <span className="flex-1 text-sm">{text}</span>
              <Icon aria-hidden className="size-5 shrink-0 text-brand-700" />
            </li>
          ))}
        </ol>
        {kind === "ios" && <p className="text-xs text-muted">{t("iosNote")}</p>}
        <button type="button" onClick={onClose} className={buttonClass("primary", "md", "w-full")}>{t("ok")}</button>
      </section>
    </div>
  );
}
