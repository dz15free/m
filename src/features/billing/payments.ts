"use client";

import { doc, getDoc, Timestamp } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";
import { authedFetch } from "@/lib/firebase/api";

/* الدفع من جهة الأستاذ: بدء Chargily ومتابعة الطلب. (البديل: التواصل مع الإدارة التي تفعّل يدويًا.) */

const db = () => getFirebase().db;

export class CheckoutError extends Error {
  constructor(public reason: "tooMany" | "unavailable" | "notConfigured" | "error") {
    super(reason);
  }
}

export async function startCheckout(planId: string, locale: "ar" | "fr"): Promise<string> {
  const res = await authedFetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId, locale }),
  }).catch(() => null);
  if (!res) throw new CheckoutError("error");
  if (res.status === 429) throw new CheckoutError("tooMany");
  if (res.status === 409) throw new CheckoutError("unavailable");
  if (res.status === 503) throw new CheckoutError("notConfigured");
  if (!res.ok) throw new CheckoutError("error");
  return ((await res.json()) as { checkoutUrl: string }).checkoutUrl;
}

export type OrderDoc = { status: "pending" | "paid" | "failed" | "mismatch"; planId: string; amount: number; periodEnd?: number | null };

export async function getOrder(id: string): Promise<OrderDoc | null> {
  const snap = await getDoc(doc(db(), "orders", id)).catch(() => null);
  if (!snap?.exists()) return null;
  const d = snap.data();
  return { ...(d as OrderDoc), periodEnd: d.periodEnd instanceof Timestamp ? d.periodEnd.toMillis() : null };
}
