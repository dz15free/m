"use client";

import { collection, doc, getDoc, getDocs, Timestamp } from "firebase/firestore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFirebase } from "@/lib/firebase/client";
import { authedFetch } from "@/lib/firebase/api";
import { useUid } from "@/features/classes/hooks";
import { effectivePlan, type AppConfig, type Entitlement, type Plan } from "@/shared/billing/plans";

const db = () => getFirebase().db;
const ms = (v: unknown) => (v instanceof Timestamp ? v.toMillis() : typeof v === "number" ? v : null);

export async function getEntitlement(uid: string): Promise<Partial<Entitlement> | null> {
  const snap = await getDoc(doc(db(), "entitlements", uid)).catch(() => null);
  if (!snap?.exists()) return null;
  const d = snap.data();
  return { ...d, currentPeriodEnd: ms(d.currentPeriodEnd), trialUsedAt: ms(d.trialUsedAt) } as Partial<Entitlement>;
}

export async function getPlans(): Promise<Plan[]> {
  const snap = await getDocs(collection(db(), "plans"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Plan, "id">) })).sort((a, b) => a.order - b.order);
}

export async function getAppConfig(): Promise<Partial<AppConfig>> {
  const snap = await getDoc(doc(db(), "config", "app")).catch(() => null);
  return (snap?.data() as Partial<AppConfig> | undefined) ?? {};
}

export class TrialError extends Error {
  constructor(public reason: "used" | "unverified" | "unavailable" | "subscribed" | "network") {
    super(reason);
  }
}

export async function startTrial(): Promise<void> {
  const res = await authedFetch("/api/billing/trial", { method: "POST" }).catch(() => null);
  if (!res) throw new TrialError("network");
  if (res.ok) return;
  const { error } = (await res.json().catch(() => ({}))) as { error?: string };
  if (error === "trial used") throw new TrialError("used");
  if (error === "email not verified") throw new TrialError("unverified");
  if (error === "already subscribed") throw new TrialError("subscribed");
  throw new TrialError(res.status === 503 ? "unavailable" : "network");
}

/** الخطة الفعلية للأستاذ (للعرض فقط؛ الحماية في القواعد والخادم). */
export function useBilling() {
  const uid = useUid();
  const ent = useQuery({ queryKey: ["entitlement", uid ?? ""], queryFn: () => getEntitlement(uid!), enabled: !!uid, staleTime: 60_000 });
  const plans = useQuery({ queryKey: ["plans"], queryFn: getPlans, staleTime: 10 * 60_000 });
  const config = useQuery({ queryKey: ["appConfig"], queryFn: getAppConfig, staleTime: 10 * 60_000 });
  const ready = ent.isSuccess && plans.isSuccess && config.isSuccess;
  const free = plans.data?.find((p) => p.id === "free") ?? null;
  const effective = effectivePlan(ent.data ?? null, free);
  const trialPlan = plans.data?.find((p) => p.id === (config.data?.trialPlanId ?? "premium"));
  const trialDays = config.data?.trialDays ?? 0;
  const trialAvailable = ready && !effective.trialUsed && effective.status === "free" && trialDays > 0 && !!trialPlan?.trialEligible;
  return { ready, effective, plans: plans.data ?? [], trialDays, trialAvailable, entitlement: ent.data ?? null };
}

export function useRefreshBilling() {
  const queryClient = useQueryClient();
  const uid = useUid();
  return () => queryClient.invalidateQueries({ queryKey: ["entitlement", uid ?? ""] });
}
