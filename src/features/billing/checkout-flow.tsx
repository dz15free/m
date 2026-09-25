"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Check, CheckCircle2, Copy, CreditCard, Landmark, LoaderCircle, Smartphone, Upload } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { useAuth } from "@/features/auth/auth-provider";
import { useTeacher, useUid } from "@/features/classes/hooks";
import { todayInAlgiers } from "@/features/attendance/logic";
import { payRef } from "@/shared/billing/plans";
import { cn } from "@/lib/utils/cn";
import { useBilling } from "./repo";
import {
  CheckoutError,
  createManualPayment,
  getBillingConfig,
  prepareReceipt,
  sha256,
  startCheckout,
  uploadReceipt,
  type BillingConfig,
} from "./payments";

type Method = "chargily" | "baridimob" | "ccp";
const ICON = { chargily: CreditCard, baridimob: Smartphone, ccp: Landmark } as const;

export function CheckoutFlow({ planId }: { planId: string }) {
  const t = useTranslations("billing.checkout");
  const locale = useLocale() as "ar" | "fr";
  const { ready, plans } = useBilling();
  const config = useQuery({ queryKey: ["billingConfig"], queryFn: getBillingConfig, staleTime: 10 * 60_000 });
  const [method, setMethod] = useState<Method | null>(null);
  const [cardState, setCardState] = useState<"idle" | "busy" | CheckoutError["reason"]>("idle");

  if (!ready || !config.data) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  const plan = plans.find((p) => p.id === planId && p.active && p.priceDzd > 0);
  if (!plan) return <Card className="py-10 text-center text-muted">{t("unavailable")}</Card>;
  const price = plan.priceDzd.toLocaleString(locale === "ar" ? "ar-DZ-u-nu-latn" : "fr-DZ");
  const available = (m: Method) => m === "chargily" || !!config.data![m];

  async function payByCard() {
    setCardState("busy");
    try {
      window.location.href = await startCheckout(plan!.id, locale);
    } catch (e) {
      setCardState(e instanceof CheckoutError ? e.reason : "error");
    }
  }

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-bold">{plan.name[locale]}</p>
          <p className="text-sm text-muted">{plan.description?.[locale]}</p>
        </div>
        <p className="shrink-0 text-2xl font-bold tabular-nums">{price} <span className="text-base">{locale === "ar" ? "دج" : "DA"}</span></p>
      </Card>

      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">{t("method")}</legend>
        {(["chargily", "baridimob", "ccp"] as const).map((m) => {
          const Icon = ICON[m];
          const on = method === m;
          return (
            <label
              key={m}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-card bg-surface p-4 shadow-card ring-2",
                on ? "ring-brand-600" : "ring-transparent",
                !available(m) && "cursor-not-allowed opacity-50",
              )}
            >
              <input type="radio" name="method" checked={on} disabled={!available(m)} onChange={() => setMethod(m)} className="mt-1 size-5 accent-brand-700" />
              <Icon aria-hidden className="mt-0.5 size-6 shrink-0 text-brand-700" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{t(`methods.${m}.title`)}</span>
                <span className="block text-sm text-muted">{available(m) ? t(`methods.${m}.body`) : t("notConfigured")}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {method === "chargily" && (
        <Card className="space-y-3">
          <button type="button" onClick={payByCard} disabled={cardState === "busy"} className={buttonClass("primary", "lg", "w-full")}>
            {cardState === "busy" ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : <CreditCard aria-hidden className="size-5" />}
            {cardState === "busy" ? t("redirecting") : `${t("payCard")} · ${price} ${locale === "ar" ? "دج" : "DA"}`}
          </button>
          {cardState !== "idle" && cardState !== "busy" && (
            <p role="alert" className="text-sm text-red-700">
              {cardState === "tooMany" ? t("tooMany") : cardState === "unavailable" ? t("unavailable") : cardState === "notConfigured" ? t("notConfigured") : t("cardError")}
            </p>
          )}
        </Card>
      )}

      {(method === "baridimob" || method === "ccp") && (
        <ManualPayment key={method} method={method} planId={plan.id} amount={plan.priceDzd} price={price} config={config.data} />
      )}
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const t = useTranslations("billing.checkout");
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        <p dir="ltr" className="break-all text-start font-mono text-[15px] font-semibold">{value}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard?.writeText(value).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className={buttonClass("secondary", "md", "shrink-0")}
      >
        {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
        {copied ? t("copied") : t("copy")}
      </button>
    </div>
  );
}

function ManualPayment({ method, planId, amount, price, config }: { method: "baridimob" | "ccp"; planId: string; amount: number; price: string; config: BillingConfig }) {
  const t = useTranslations("billing.checkout");
  const locale = useLocale() as "ar" | "fr";
  const uid = useUid();
  const auth = useAuth();
  const teacher = useTeacher().data;
  const [ref] = useState(() => payRef(crypto.getRandomValues(new Uint8Array(5))));
  const [declared, setDeclared] = useState(String(amount));
  const [paidAt, setPaidAt] = useState(todayInAlgiers());
  const [txRef, setTxRef] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error" | "tooBig">("idle");
  const input = useRef<HTMLInputElement>(null);
  const steps = t.raw(method === "baridimob" ? "baridiSteps" : "ccpSteps") as string[];
  const cur = locale === "ar" ? "دج" : "DA";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid || !file) return;
    setState("busy");
    try {
      const blob = await prepareReceipt(file);
      if (blob.size > 5 * 1024 * 1024) return setState("tooBig");
      const [receiptHash, receiptKey] = await Promise.all([sha256(blob), uploadReceipt(blob)]);
      await createManualPayment({
        uid,
        teacherName: teacher ? `${teacher.profile.lastName} ${teacher.profile.firstName}` : "",
        email: auth.status === "signedIn" ? (auth.user.email ?? "") : "",
        planId,
        expectedAmount: amount,
        declaredAmount: Math.round(Number(declared.replace(/[^\d]/g, "")) || 0),
        method,
        paidAt,
        transactionRef: txRef.trim().slice(0, 60),
        receiptKey,
        receiptHash,
        payRef: ref,
      });
      setState("sent");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 aria-hidden className="size-10 text-green-700" />
        <p className="text-lg font-bold">{t("sent")}</p>
        <p className="max-w-sm text-sm text-muted">{t("sentBody")}</p>
        <Link href="/app/billing" className={buttonClass("secondary")}>{t("back")}</Link>
      </Card>
    );
  }

  const bm = config.baridimob;
  const ccp = config.ccp;
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        {method === "baridimob" && bm && (
          <>
            <CopyRow label={t("rip")} value={bm.rip} />
            {bm.holder && <CopyRow label={t("holder")} value={bm.holder} />}
          </>
        )}
        {method === "ccp" && ccp && (
          <>
            <CopyRow label={t("account")} value={ccp.account} />
            {ccp.key && <CopyRow label={t("key")} value={ccp.key} />}
            {ccp.holder && <CopyRow label={t("holder")} value={ccp.holder} />}
          </>
        )}
        <CopyRow label={`${t("amount")} (${cur})`} value={String(amount)} />
        <div>
          <CopyRow label={t("ref")} value={ref} />
          <p className="mt-1 text-xs text-muted">{t("refHint")}</p>
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">{t("steps")}</p>
          <ol className="list-inside list-decimal space-y-1 text-sm">
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      </Card>

      <Card>
        <form onSubmit={submit} className="space-y-3">
          <h2 className="font-semibold">{t("proof")}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("declared")} inputMode="numeric" dir="ltr" required value={declared} onChange={(e) => setDeclared(e.target.value)} />
            <Field label={t("paidAt")} type="date" required value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </div>
          <Field label={t("txRef")} dir="ltr" maxLength={60} value={txRef} onChange={(e) => setTxRef(e.target.value)} />
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{t("receipt")}</p>
            <input ref={input} type="file" accept="image/*,application/pdf" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => input.current?.click()} className={buttonClass("secondary", "md", "w-full justify-start")}>
              <Upload aria-hidden className="size-4" />
              <span className="truncate">{file ? file.name : t("pickReceipt")}</span>
            </button>
          </div>
          {(state === "error" || state === "tooBig") && (
            <p role="alert" className="text-sm text-red-700">{state === "tooBig" ? t("receiptTooBig") : t("sendError")}</p>
          )}
          <button type="submit" disabled={!file || state === "busy"} className={buttonClass("primary", "lg", "w-full")}>
            {state === "busy" && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
            {state === "busy" ? t("sending") : `${t("submit")} · ${price} ${cur}`}
          </button>
        </form>
      </Card>
    </div>
  );
}
