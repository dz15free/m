"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LoaderCircle, Sparkles, X } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { startTrial, TrialError, useBilling, useRefreshBilling } from "./repo";

const DISMISS_KEY = "trialOfferDismissed";

/** عرض التجربة المجانية — يظهر بعد إكمال معالج البداية حتى تُستعمل أو تُؤجَّل. */
export function TrialOffer({ dismissible = true }: { dismissible?: boolean }) {
  const t = useTranslations("billing");
  const billing = useBilling();
  const refresh = useRefreshBilling();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<TrialError["reason"] | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    if (!dismissible || typeof window === "undefined") return false;
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (state === "done") {
    return <p role="status" className="rounded-card bg-green-50 p-4 font-medium text-green-800">{t("trialStarted")}</p>;
  }
  if (!billing.trialAvailable || dismissed) return null;

  async function start() {
    setState("busy");
    setError(null);
    try {
      await startTrial();
      await refresh();
      setState("done");
    } catch (e) {
      setError(e instanceof TrialError ? e.reason : "network");
      setState("idle");
    }
  }

  return (
    <section aria-labelledby="trial-title" className="relative overflow-hidden rounded-card bg-linear-to-br from-brand-900 to-brand-600 p-5 text-white shadow-card">
      {dismissible && (
        <button
          type="button"
          aria-label={t("later")}
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {}
            setDismissed(true);
          }}
          className="absolute end-2 top-2 grid size-10 place-items-center rounded-full text-white/80 hover:bg-white/10"
        >
          <X aria-hidden className="size-5" />
        </button>
      )}
      <Sparkles aria-hidden className="mb-2 size-7 text-accent-300" />
      <h2 id="trial-title" className="pe-8 text-lg font-bold">{t("trialTitle", { n: billing.trialDays })}</h2>
      <p className="mt-1 text-sm text-white/85">{t("trialBody")}</p>
      {error && <p role="alert" className="mt-2 rounded-lg bg-white/15 px-3 py-2 text-sm">{t(`trialErrors.${error}`)}</p>}
      <button type="button" onClick={start} disabled={state === "busy"} className={buttonClass("secondary", "md", "mt-4 bg-white text-brand-900")}>
        {state === "busy" && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
        {t("trialCta")}
      </button>
    </section>
  );
}
