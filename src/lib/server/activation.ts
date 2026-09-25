import "server-only";
import { effectivePlan, netOf, renewEnd, revenueMonth, type Entitlement, type Plan } from "@/shared/billing/plans";
import { adminGet, type Write } from "./firestore-admin";
import { HttpError } from "./auth";

/* تفعيل الاشتراك بعد دفعة مؤكَّدة (Chargily أو يدوية بعد المراجعة).
   يُرجع الكتابات فقط؛ المستدعي يضيف كتاباته (الطلب، الحدث…) ويُرسلها في commit واحد ذرّي،
   بشرط مسبق على نسخة وثيقة الاشتراك: تفعيلان متزامنان لا يضيعان أيامًا ولا يتكرران. */

export type PaymentInput = {
  uid: string;
  planId: string;
  paymentId: string;
  method: "chargily" | "baridimob" | "ccp";
  gross: number;
  fees: number;
  feesPassedToCustomer?: boolean;
  sourceId: string; // معرّف الطلب أو الدفعة اليدوية
};

export async function activationWrites(p: PaymentInput, now = Date.now()): Promise<{ writes: Write[]; until: number }> {
  const plan = (await adminGet(`plans/${p.planId}`))?.data as Partial<Plan> | undefined;
  if (!plan || !plan.durationDays) throw new HttpError(409, "plan unavailable");

  const current = await adminGet(`entitlements/${p.uid}`);
  const ent = (current?.data ?? null) as Partial<Entitlement> | null;
  const eff = effectivePlan(ent, null, now);
  // التجديد المبكر أو الانتقال من التجربة يُضاف فوق الأيام المتبقية
  const until = renewEnd(eff.status === "free" ? null : eff.endsAt, now, plan.durationDays);
  const net = netOf(p.gross, p.fees, !!p.feesPassedToCustomer);
  const month = revenueMonth(now);

  const writes: Write[] = [
    {
      path: `entitlements/${p.uid}`,
      data: {
        planId: p.planId,
        status: "active",
        currentPeriodEnd: new Date(until),
        limits: { maxClasses: Number(plan.limits?.maxClasses ?? 0) },
        features: plan.features ?? [],
        contentAccess: plan.contentAccess ?? "premium",
        trialUsedAt: typeof ent?.trialUsedAt === "number" ? new Date(ent.trialUsedAt) : null,
        source: p.method === "chargily" ? "chargily" : "manual",
        lastPaymentId: p.paymentId,
        updatedAt: new Date(now),
      },
      precondition: current ? { updateTime: current.updateTime } : { exists: false },
    },
    {
      path: `payments/${p.paymentId}`,
      data: {
        uid: p.uid,
        planId: p.planId,
        method: p.method,
        currency: "dzd",
        gross: p.gross,
        fees: p.fees,
        net,
        sourceId: p.sourceId,
        periodEnd: new Date(until),
        createdAt: new Date(now),
      },
      precondition: { exists: false },
    },
    {
      path: `stats/revenue_${month}`,
      data: { month },
      increments: {
        gross: p.gross,
        fees: p.fees,
        net,
        count: 1,
        [`byMethod.${p.method}`]: p.gross,
        [`byPlan.${p.planId}`]: p.gross,
      },
    },
    {
      path: `auditLogs/${p.paymentId}`,
      data: { action: "payment.activate", uid: p.uid, planId: p.planId, method: p.method, gross: p.gross, until: new Date(until), at: new Date(now) },
      precondition: { exists: false },
    },
  ];
  return { writes, until };
}
