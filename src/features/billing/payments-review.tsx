"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Check, ExternalLink, LoaderCircle, ShieldAlert, X } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-provider";
import { formatLongDate } from "@/i18n/dates";
import { fetchReceipt, findDuplicates, listPendingManualPayments, reviewPayment, type ManualPayment } from "./payments";

export function useIsFinance() {
  const auth = useAuth();
  return auth.status === "signedIn" && (auth.roles.includes("admin") || auth.roles.includes("finance"));
}

export function PaymentsReview() {
  const t = useTranslations("paymentsAdmin");
  const finance = useIsFinance();
  const list = useQuery({ queryKey: ["pendingPayments"], queryFn: listPendingManualPayments, enabled: finance });

  if (!finance) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <ShieldAlert aria-hidden className="size-8 text-red-700" />
        <p className="text-muted">{t("forbidden")}</p>
      </Card>
    );
  }
  if (!list.data) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  if (!list.data.length) return <Card className="py-10 text-center text-muted">{t("empty")}</Card>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t("pending", { n: list.data.length })}</p>
      <ul className="space-y-3">
        {list.data.map((m) => (
          <li key={m.id}>
            <ReviewCard mp={m} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewCard({ mp }: { mp: ManualPayment }) {
  const t = useTranslations("paymentsAdmin");
  const tb = useTranslations("billing.checkout");
  const locale = useLocale() as "ar" | "fr";
  const queryClient = useQueryClient();
  const dups = useQuery({ queryKey: ["mpDups", mp.id], queryFn: () => findDuplicates(mp) });
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error" | "needNote">("idle");

  async function open() {
    const win = window.open("", "_blank");
    try {
      const url = URL.createObjectURL(await fetchReceipt(mp.receiptKey));
      if (win) win.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      win?.close();
      setState("error");
    }
  }

  async function decide(decision: "approve" | "reject") {
    if (decision === "reject" && !note.trim()) return setState("needNote");
    setState("busy");
    try {
      await reviewPayment(mp.id, decision, note.trim());
      setState("done");
      await queryClient.invalidateQueries({ queryKey: ["pendingPayments"] });
    } catch {
      setState("error");
    }
  }

  const warnings = [
    mp.declaredAmount !== mp.expectedAmount && t("warnAmount"),
    dups.data?.sameReceipt ? t("warnReceipt", { n: dups.data.sameReceipt }) : null,
    dups.data?.sameRef ? t("warnRef", { n: dups.data.sameRef }) : null,
  ].filter(Boolean) as string[];

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{mp.teacherName || mp.email}</p>
          <p dir="ltr" className="text-start text-sm text-muted">{mp.email}</p>
        </div>
        <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold">{tb(`methods.${mp.method}.title`)}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">{t("expected")}</dt>
        <dd className="tabular-nums">{mp.expectedAmount}</dd>
        <dt className="text-muted">{t("declared")}</dt>
        <dd className="font-bold tabular-nums">{mp.declaredAmount}</dd>
        <dt className="text-muted">{t("paidAt")}</dt>
        <dd>{formatLongDate(new Date(`${mp.paidAt}T12:00:00`), locale)}</dd>
        <dt className="text-muted">{t("ref")}</dt>
        <dd dir="ltr" className="text-start font-mono">{mp.payRef}</dd>
        {mp.transactionRef && (
          <>
            <dt className="text-muted">{t("txRef")}</dt>
            <dd dir="ltr" className="text-start font-mono">{mp.transactionRef}</dd>
          </>
        )}
      </dl>
      {warnings.map((w) => (
        <p key={w} role="alert" className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
          <AlertTriangle aria-hidden className="size-4 shrink-0" />
          {w}
        </p>
      ))}
      <button type="button" onClick={open} className={buttonClass("secondary")}>
        <ExternalLink aria-hidden className="size-4" />
        {t("viewReceipt")}
      </button>
      {state === "done" ? (
        <p className="font-semibold text-green-800">{t("done")}</p>
      ) : (
        <>
          <label className="block space-y-1.5">
            <span className="block text-sm font-medium">{t("note")}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              rows={2}
              dir="auto"
              className="block w-full rounded-xl border border-line bg-surface px-3 py-2 outline-none focus:border-brand-600"
            />
          </label>
          {(state === "error" || state === "needNote") && (
            <p role="alert" className="text-sm text-red-700">{state === "needNote" ? t("needNote") : t("error")}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => decide("approve")} disabled={state === "busy"} className={buttonClass("primary")}>
              {state === "busy" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Check aria-hidden className="size-4" />}
              {t("approve")}
            </button>
            <button type="button" onClick={() => decide("reject")} disabled={state === "busy"} className={buttonClass("ghost", "md", "text-red-700")}>
              <X aria-hidden className="size-4" />
              {t("reject")}
            </button>
          </div>
        </>
      )}
    </Card>
  );
}

export function PaymentsLink() {
  const t = useTranslations("paymentsAdmin");
  if (!useIsFinance()) return null;
  return (
    <Link href="/app/manage/payments" className="flex min-h-14 items-center gap-4 rounded-card bg-surface px-4 shadow-card transition-colors hover:bg-brand-50">
      <span className="grid size-10 place-items-center rounded-xl bg-accent-100 text-accent-700">
        <Check aria-hidden className="size-5" />
      </span>
      <span className="flex-1 font-medium">{t("link")}</span>
    </Link>
  );
}
