"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Download, LoaderCircle, Send, Trash2 } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, SelectField } from "@/components/ui/field";
import { useUid } from "@/features/classes/hooks";
import { deleteAnnouncement, listAnnouncements, publishAnnouncement, type Kind } from "@/features/notifications/repo";
import { cn } from "@/lib/utils/cn";
import { emailsOf, listAudit, listOrders, listPayments } from "./repo";

const fmtDate = (locale: "ar" | "fr", at: number) =>
  at ? new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ-u-nu-latn" : "fr-DZ", { dateStyle: "medium", timeStyle: "short" }).format(at) : "—";

function Loading() {
  return (
    <div className="grid place-items-center py-16">
      <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
    </div>
  );
}

// ── الإشعارات ──

export function AdminNotifications() {
  const t = useTranslations("admin.notif");
  const ta = useTranslations("admin");
  const locale = useLocale() as "ar" | "fr";
  const uid = useUid();
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ["adminAnnouncements"], queryFn: listAnnouncements });
  const blank = { title: { ar: "", fr: "" }, body: { ar: "", fr: "" }, link: "", kind: "news" as Exclude<Kind, "billing"> };
  const [a, setA] = useState(blank);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!uid || (!a.title.ar.trim() && !a.title.fr.trim())) return;
    setState("busy");
    try {
      await publishAnnouncement(a);
      setA(blank);
      setState("done");
      await queryClient.invalidateQueries({ queryKey: ["adminAnnouncements"] });
    } catch {
      setState("error");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{ta("nav.notifications")}</h1>
      <Card>
        <form onSubmit={publish} className="space-y-3">
          <h2 className="font-semibold">{t("compose")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("titleAr")} maxLength={140} value={a.title.ar} onChange={(e) => (setA({ ...a, title: { ...a.title, ar: e.target.value } }), setState("idle"))} />
            <Field label={t("titleFr")} dir="ltr" maxLength={140} value={a.title.fr} onChange={(e) => setA({ ...a, title: { ...a.title, fr: e.target.value } })} />
            {(["ar", "fr"] as const).map((l) => (
              <label key={l} className="block space-y-1.5">
                <span className="block text-sm font-medium">{t(l === "ar" ? "bodyAr" : "bodyFr")}</span>
                <textarea
                  value={a.body[l]}
                  onChange={(e) => setA({ ...a, body: { ...a.body, [l]: e.target.value } })}
                  maxLength={1000}
                  rows={3}
                  dir={l === "ar" ? "rtl" : "ltr"}
                  className="block w-full rounded-xl border border-line bg-surface px-3 py-2.5 outline-none focus:border-brand-600"
                />
              </label>
            ))}
            <Field label={t("link")} dir="ltr" maxLength={300} value={a.link} onChange={(e) => setA({ ...a, link: e.target.value })} />
            <SelectField label={t("kind")} value={a.kind} onChange={(e) => setA({ ...a, kind: e.target.value as typeof a.kind })}>
              {(["news", "update", "content", "offer"] as const).map((k) => (
                <option key={k} value={k}>{t(`kinds.${k}`)}</option>
              ))}
            </SelectField>
          </div>
          {state === "error" && <p role="alert" className="text-sm text-red-700">✕</p>}
          <button type="submit" disabled={state === "busy"} className={buttonClass("primary")}>
            {state === "busy" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Send aria-hidden className="size-4 rtl:-scale-x-100" />}
            {state === "done" ? t("published") : t("publish")}
          </button>
        </form>
      </Card>
      <section className="space-y-2">
        <h2 className="font-semibold">{t("history")}</h2>
        {!list.data ? (
          <Loading />
        ) : !list.data.length ? (
          <Card className="py-8 text-center text-muted">{t("empty")}</Card>
        ) : (
          <ul className="space-y-2">
            {list.data.map((n) => (
              <li key={n.id}>
                <Card className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted">{t(`kinds.${n.kind as Exclude<Kind, "billing">}`)} · {fmtDate(locale, n.createdAt)}</p>
                    <p dir="auto" className="font-semibold">{n.title[locale] || n.title.ar || n.title.fr}</p>
                    <p dir="auto" className="line-clamp-2 text-sm text-muted">{n.body[locale] || n.body.ar || n.body.fr}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={t("delete")}
                    onClick={async () => {
                      if (!window.confirm(t("deleteConfirm"))) return;
                      await deleteAnnouncement(n.id);
                      await queryClient.invalidateQueries({ queryKey: ["adminAnnouncements"] });
                    }}
                    className="grid size-10 place-items-center rounded-full text-muted hover:text-red-700"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ── المدفوعات ──

export function AdminPayments() {
  const t = useTranslations("admin.payments");
  const ta = useTranslations("admin");
  const locale = useLocale() as "ar" | "fr";
  const payments = useQuery({ queryKey: ["adminPayments"], queryFn: listPayments });
  const orders = useQuery({ queryKey: ["adminOrders"], queryFn: listOrders });
  const emails = useQuery({
    queryKey: ["adminPaymentEmails", payments.data?.map((p) => p.uid).join(",")],
    queryFn: () => emailsOf(payments.data!.map((p) => p.uid)),
    enabled: !!payments.data?.length,
  });
  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-DZ-u-nu-latn" : "fr-DZ");

  function csv() {
    const rows = [["date", "email", "method", "plan", "gross", "fees", "net", "until"]];
    for (const p of payments.data ?? []) {
      rows.push([new Date(p.createdAt).toISOString(), emails.data?.get(p.uid) ?? p.uid, p.method, p.planId, String(p.gross), String(p.fees), String(p.net), p.periodEnd ? new Date(p.periodEnd).toISOString().slice(0, 10) : ""]);
    }
    const blob = new Blob(["﻿" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{ta("nav.payments")}</h1>
        {!!payments.data?.length && (
          <button type="button" onClick={csv} className={buttonClass("secondary")}>
            <Download aria-hidden className="size-4" />
            {t("csv")}
          </button>
        )}
      </div>
      <section className="space-y-2">
        <h2 className="font-semibold">{t("recent")}</h2>
        {!payments.data ? (
          <Loading />
        ) : !payments.data.length ? (
          <Card className="py-8 text-center text-muted">{t("empty")}</Card>
        ) : (
          <div className="overflow-x-auto rounded-card bg-surface shadow-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-canvas text-xs text-muted">
                <tr>
                  {["date", "teacher", "method", "gross", "fees", "net", "until"].map((k) => (
                    <th key={k} className="px-3 py-2 text-start font-medium">{t(k as "date")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.data.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(locale, p.createdAt)}</td>
                    <td className="px-3 py-2" dir="ltr">{emails.data?.get(p.uid) ?? "…"}</td>
                    <td className="px-3 py-2">{t(`methods.${p.method === "chargily" ? "chargily" : "admin"}`)}</td>
                    <td className="px-3 py-2 font-semibold tabular-nums">{nf.format(p.gross)}</td>
                    <td className="px-3 py-2 tabular-nums">{nf.format(p.fees)}</td>
                    <td className="px-3 py-2 tabular-nums">{nf.format(p.net)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{p.periodEnd ? new Date(p.periodEnd).toISOString().slice(0, 10) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">{t("orders")}</h2>
        {!orders.data ? (
          <Loading />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
            {orders.data.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <span className="w-40 shrink-0 text-muted">{fmtDate(locale, o.createdAt)}</span>
                <span dir="ltr" className="min-w-0 flex-1 truncate">{o.email}</span>
                <span className="tabular-nums">{nf.format(o.amount)}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    o.status === "paid" ? "bg-green-50 text-green-800" : o.status === "pending" ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-800",
                  )}
                >
                  {t(`status.${(["pending", "paid", "failed", "mismatch"].includes(o.status) ? o.status : "failed") as "paid"}`)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ── سجل العمليات ──

export function AdminAudit() {
  const t = useTranslations("admin.audit");
  const ta = useTranslations("admin");
  const locale = useLocale() as "ar" | "fr";
  const list = useQuery({ queryKey: ["adminAudit"], queryFn: listAudit });
  const emails = useQuery({
    queryKey: ["adminAuditEmails", list.data?.length],
    queryFn: () => emailsOf(list.data!.flatMap((r) => [r.uid, r.by].filter((x): x is string => typeof x === "string"))),
    enabled: !!list.data?.length,
  });
  const known = ["trial.start", "payment.activate", "payment.mismatch", "admin.grant", "admin.revoke", "admin.roles"];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{ta("nav.audit")}</h1>
      {!list.data ? (
        <Loading />
      ) : !list.data.length ? (
        <Card className="py-8 text-center text-muted">{t("empty")}</Card>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
          {list.data.map((r) => (
            <li key={r.id} className="space-y-0.5 px-4 py-2.5 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{known.includes(r.action) ? t(`actions.${r.action.replace(".", "_")}` as "actions.trial_start") : r.action}</span>
                <span className="text-muted">{fmtDate(locale, r.at)}</span>
              </p>
              <p className="text-muted" dir="ltr">
                {r.uid ? emails.data?.get(r.uid) ?? r.uid : ""}
                {r.by ? ` ← ${emails.data?.get(r.by) ?? r.by}` : ""}
                {typeof r.gross === "number" ? ` · ${r.gross}` : ""}
                {typeof r.days === "number" ? ` · ${r.days}d` : ""}
                {typeof r.note === "string" && r.note ? ` · ${r.note}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
