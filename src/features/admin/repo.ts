"use client";

import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  Timestamp,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";
import { authedFetch } from "@/lib/firebase/api";
import { revenueMonth, type AppConfig, type Plan } from "@/shared/billing/plans";

const db = () => getFirebase().db;
const ms = (v: unknown) => (v instanceof Timestamp ? v.toMillis() : typeof v === "number" ? v : 0);

// ── الرئيسية ──

export type Kpis = { teachers: number; newWeek: number; paidActive: number; trialsActive: number; unread: number };

export async function getKpis(): Promise<Kpis> {
  const now = Timestamp.now();
  const weekAgo = Timestamp.fromMillis(Date.now() - 7 * 864e5);
  const c = async (q: Parameters<typeof getCountFromServer>[0]) => (await getCountFromServer(q).catch(() => null))?.data().count ?? 0;
  const [teachers, newWeek, live, unread] = await Promise.all([
    c(collection(db(), "users")),
    c(query(collection(db(), "users"), where("createdAt", ">=", weekAgo))),
    // الاشتراكات السارية فقط، ثم نفصل المدفوع عن التجربة (الطلبات غير المدفوعة لا تُنشئ اشتراكًا)
    getDocs(query(collection(db(), "entitlements"), where("currentPeriodEnd", ">", now))).catch(() => null),
    c(query(collection(db(), "supportThreads"), where("unreadAdmin", "==", true))),
  ]);
  const statuses = live?.docs.map((d) => d.data().status) ?? [];
  return {
    teachers,
    newWeek,
    paidActive: statuses.filter((x) => x === "active").length,
    trialsActive: statuses.filter((x) => x === "trial").length,
    unread,
  };
}

export type MonthRevenue = { month: string; gross: number; fees: number; net: number; count: number };

export async function getRevenue(months = 12): Promise<MonthRevenue[]> {
  const keys: string[] = [];
  const d = new Date();
  for (let i = months - 1; i >= 0; i--) keys.push(revenueMonth(new Date(d.getFullYear(), d.getMonth() - i, 15).getTime()));
  const snaps = await Promise.all(keys.map((k) => getDoc(doc(db(), "stats", `revenue_${k}`)).catch(() => null)));
  return keys.map((month, i) => {
    const x = snaps[i]?.data() ?? {};
    return { month, gross: Number(x.gross ?? 0), fees: Number(x.fees ?? 0), net: Number(x.net ?? 0), count: Number(x.count ?? 0) };
  });
}

// ── الأساتذة ──

export type UserRow = { uid: string; displayName: string; email: string; createdAt: number; onboardingDone: boolean };
const toUser = (d: QueryDocumentSnapshot) => ({ uid: d.id, ...(d.data() as Omit<UserRow, "uid" | "createdAt">), createdAt: ms(d.data().createdAt) });

export async function listUsers(after?: QueryDocumentSnapshot, emailPrefix = ""): Promise<{ rows: UserRow[]; last?: QueryDocumentSnapshot }> {
  const col = collection(db(), "users");
  const p = emailPrefix.trim().toLowerCase();
  const q = p
    ? query(col, where("email", ">=", p), where("email", "<=", `${p}`), orderBy("email"), limit(30))
    : query(col, orderBy("createdAt", "desc"), ...(after ? [startAfter(after)] : []), limit(30));
  const snap = await getDocs(q);
  return { rows: snap.docs.map(toUser), last: snap.docs.at(-1) };
}

export async function getTeacherOverview(uid: string) {
  const [teacher, ent] = await Promise.all([
    getDoc(doc(db(), "teachers", uid)).catch(() => null),
    getDoc(doc(db(), "entitlements", uid)).catch(() => null),
  ]);
  const e = ent?.data();
  return {
    profile: teacher?.data() as { firstName?: string; lastName?: string; gradeId?: string; gradeCustom?: string; wilayaCode?: number; stage?: string } | undefined,
    entitlement: e
      ? {
          status: e.status as string,
          planId: e.planId as string,
          end: ms(e.currentPeriodEnd),
          source: e.source as string,
          active: (e.status === "active" || e.status === "trial") && ms(e.currentPeriodEnd) > Date.now(),
        }
      : null,
  };
}

export async function adminApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authedFetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `http ${res.status}`);
  return body;
}

// ── الخطط والإعدادات ──

export async function getPlansAdmin(): Promise<Plan[]> {
  const snap = await getDocs(collection(db(), "plans"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Plan, "id">) })).sort((a, b) => a.order - b.order);
}

export async function savePlan(p: Plan) {
  const { id, ...data } = p;
  await setDoc(doc(db(), "plans", id), data);
}

export async function saveAppConfig(patch: Partial<AppConfig>) {
  await setDoc(doc(db(), "config", "app"), patch, { merge: true });
}

// ── المدفوعات والسجل ──

export type PaymentRow = { id: string; uid: string; email?: string; planId: string; method: string; gross: number; fees: number; net: number; createdAt: number; periodEnd: number };

export async function listPayments(): Promise<PaymentRow[]> {
  const snap = await getDocs(query(collection(db(), "payments"), orderBy("createdAt", "desc"), limit(100)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PaymentRow, "id" | "createdAt" | "periodEnd">), createdAt: ms(d.data().createdAt), periodEnd: ms(d.data().periodEnd) }));
}

export type OrderRow = { id: string; uid: string; email: string; amount: number; status: string; createdAt: number };

export async function listOrders(): Promise<OrderRow[]> {
  const snap = await getDocs(query(collection(db(), "orders"), orderBy("createdAt", "desc"), limit(30)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<OrderRow, "id" | "createdAt">), createdAt: ms(d.data().createdAt) }));
}

export type AuditRow = { id: string; action: string; uid?: string; by?: string; at: number; [k: string]: unknown };

export async function listAudit(): Promise<AuditRow[]> {
  const snap = await getDocs(query(collection(db(), "auditLogs"), orderBy("at", "desc"), limit(100)));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<AuditRow, "id" | "at">), id: d.id, action: String(d.data().action ?? ""), at: ms(d.data().at) }));
}

export async function emailsOf(uids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(uids)].slice(0, 100);
  const snaps = await Promise.all(unique.map((u) => getDoc(doc(db(), "users", u)).catch(() => null)));
  return new Map(unique.map((u, i) => [u, (snaps[i]?.data()?.email as string) ?? u]));
}

export type StaffRow = { uid: string; email: string; roles: { admin: boolean; contentEditor: boolean; finance: boolean } };
export const listStaff = () => adminApi<StaffRow[]>("/api/admin/staff");

/** الاسم والبريد لقائمة أساتذة (لجدول المدفوعات). */
export async function peopleOf(uids: string[]): Promise<Map<string, { email: string; name: string }>> {
  const unique = [...new Set(uids)].slice(0, 100);
  const snaps = await Promise.all(unique.map((u) => getDoc(doc(db(), "users", u)).catch(() => null)));
  return new Map(unique.map((u, i) => [u, { email: (snaps[i]?.data()?.email as string) ?? u, name: (snaps[i]?.data()?.displayName as string) ?? "" }]));
}
