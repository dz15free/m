"use client";

import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, Timestamp, where } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";
import { authedFetch } from "@/lib/firebase/api";

/* الدفع من جهة الأستاذ: بدء Chargily، والدفع اليدوي (ضغط الإيصال وبصمته ثم الرفع والطلب). */

const db = () => getFirebase().db;

export type BillingConfig = {
  baridimob?: { rip: string; holder: string; note?: string };
  ccp?: { account: string; key: string; holder: string };
};

export async function getBillingConfig(): Promise<BillingConfig> {
  const snap = await getDoc(doc(db(), "config", "billing")).catch(() => null);
  return (snap?.data() as BillingConfig | undefined) ?? {};
}

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

// ── الدفع اليدوي ──

/** تصغير صورة الإيصال (≤ 1600px، JPEG) — أخف للرفع وأوضح للمراجعة. PDF يُرفع كما هو. */
export async function prepareReceipt(file: File): Promise<Blob> {
  if (file.type === "application/pdf") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.75));
}

/** بصمة SHA-256 لكشف الإيصال نفسه إن أُرسل مرتين. */
export async function sha256(blob: Blob): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()));
  return Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function uploadReceipt(blob: Blob): Promise<string> {
  const res = await authedFetch("/api/billing/receipts", { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
  if (!res.ok) throw new Error(`receipt ${res.status}`);
  return ((await res.json()) as { key: string }).key;
}

export type ManualPayment = {
  id: string;
  planId: string;
  expectedAmount: number;
  declaredAmount: number;
  method: "baridimob" | "ccp";
  paidAt: string;
  transactionRef: string;
  payRef: string;
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  createdAt: number;
  uid: string;
  teacherName: string;
  email: string;
  receiptKey: string;
  receiptHash: string;
};

export async function createManualPayment(input: Omit<ManualPayment, "id" | "status" | "adminNote" | "createdAt">) {
  await addDoc(collection(db(), "manualPayments"), { ...input, status: "pending", createdAt: serverTimestamp() });
}

const toMp = (id: string, d: Record<string, unknown>) =>
  ({ id, ...d, createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : Date.now() }) as ManualPayment;

export async function listMyManualPayments(uid: string): Promise<ManualPayment[]> {
  const snap = await getDocs(query(collection(db(), "manualPayments"), where("uid", "==", uid)));
  return snap.docs.map((d) => toMp(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt);
}

// ── المراجعة (المالية/الأدمن) ──

export async function listPendingManualPayments(): Promise<ManualPayment[]> {
  const snap = await getDocs(query(collection(db(), "manualPayments"), where("status", "==", "pending")));
  return snap.docs.map((d) => toMp(d.id, d.data())).sort((a, b) => a.createdAt - b.createdAt);
}

/** طلبات أخرى بنفس بصمة الإيصال أو نفس رقم العملية (تنبيه احتيال محتمل). */
export async function findDuplicates(mp: ManualPayment): Promise<{ sameReceipt: number; sameRef: number }> {
  const col = collection(db(), "manualPayments");
  const [a, b] = await Promise.all([
    getDocs(query(col, where("receiptHash", "==", mp.receiptHash))),
    mp.transactionRef ? getDocs(query(col, where("transactionRef", "==", mp.transactionRef))) : null,
  ]);
  return { sameReceipt: a.docs.filter((d) => d.id !== mp.id).length, sameRef: b ? b.docs.filter((d) => d.id !== mp.id).length : 0 };
}

export async function fetchReceipt(key: string): Promise<Blob> {
  const res = await authedFetch(`/api/admin/${key}`);
  if (!res.ok) throw new Error(`receipt ${res.status}`);
  return res.blob();
}

export async function reviewPayment(id: string, decision: "approve" | "reject", note: string) {
  const res = await authedFetch(`/api/admin/payments/${id}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, note }),
  });
  if (!res.ok) throw new Error(`review ${res.status}`);
}
