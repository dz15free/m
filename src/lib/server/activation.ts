import "server-only";
import { sendToUser } from "./push";
import { effectivePlan, netOf, renewEnd, revenueMonth, type Entitlement, type Plan } from "@/shared/billing/plans";
import { adminGet, adminIdsWhere, type Write } from "./firestore-admin";
import { HttpError } from "./auth";

/* تفعيل الاشتراك بعد دفعة مؤكَّدة (Chargily أو يدوية بعد المراجعة).
   يُرجع الكتابات فقط؛ المستدعي يضيف كتاباته (الطلب، الحدث…) ويُرسلها في commit واحد ذرّي،
   بشرط مسبق على نسخة وثيقة الاشتراك: تفعيلان متزامنان لا يضيعان أيامًا ولا يتكرران. */

export type PaymentInput = {
  uid: string;
  planId: string;
  paymentId: string;
  method: "chargily" | "admin";
  gross: number;
  fees: number;
  feesPassedToCustomer?: boolean;
  sourceId: string; // معرّف الطلب أو عملية الأدمن
  /** بريد الدافع وقت الدفع (للعرض في لوحة الإدارة) */
  email?: string;
  /** مدة مخصّصة (تفعيل يدوي من الأدمن)؛ وإلا مدة الخطة */
  days?: number;
};

export async function activationWrites(p: PaymentInput, now = Date.now()): Promise<{ writes: Write[]; until: number }> {
  const plan = (await adminGet(`plans/${p.planId}`))?.data as Partial<Plan> | undefined;
  const days = p.days ?? plan?.durationDays;
  if (!plan || !days) throw new HttpError(409, "plan unavailable");

  const current = await adminGet(`entitlements/${p.uid}`);
  const ent = (current?.data ?? null) as Partial<Entitlement> | null;
  const eff = effectivePlan(ent, null, now);
  // التجديد المبكر أو الانتقال من التجربة يُضاف فوق الأيام المتبقية
  const until = renewEnd(eff.status === "free" ? null : eff.endsAt, now, days);
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
        source: p.method === "chargily" ? "chargily" : "admin",
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
        email: (p.email ?? "").slice(0, 200),
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
    // إشعار شخصي للأستاذ + تاريخ آخر إشعار (يضيء الجرس)
    {
      path: `teachers/${p.uid}/notifications/${p.paymentId}`,
      data: {
        kind: "billing",
        title: { ar: "تم تفعيل اشتراكك 🎉", fr: "Votre abonnement est activé 🎉" },
        body: {
          ar: `اشتراكك صالح حتى ${new Date(until).toISOString().slice(0, 10).split("-").reverse().join("/")}. شكرًا لثقتك!`,
          fr: `Votre abonnement est valable jusqu'au ${new Date(until).toISOString().slice(0, 10).split("-").reverse().join("/")}. Merci !`,
        },
        link: "/app/billing",
        createdAt: new Date(now),
      },
    },
    { path: `teachers/${p.uid}/prefs/notifications`, data: { personalLatestAt: new Date(now) }, merge: true },
    {
      path: `auditLogs/${p.paymentId}`,
      data: { action: "payment.activate", uid: p.uid, planId: p.planId, method: p.method, gross: p.gross, until: new Date(until), at: new Date(now) },
      precondition: { exists: false },
    },
  ];
  return { writes, until };
}

/** إشعار هاتف بعد التفعيل (لا يرمي أبدًا). */
export async function notifyActivated(uid: string, until: number) {
  const day = (l: string) => new Intl.DateTimeFormat(l, { dateStyle: "long", timeZone: "Africa/Algiers" }).format(until);
  await sendToUser(uid, {
    ar: { title: "تم تفعيل اشتراكك ✨", body: `Premium مفعّل حتى ${day("ar-DZ-u-nu-latn")}`, link: "/app/billing", tag: "billing" },
    fr: { title: "Abonnement activé ✨", body: `Premium actif jusqu'au ${day("fr-DZ")}`, link: "/app/billing", tag: "billing" },
  });
}

/** إشعار هاتف لفريق الإدارة عند كل دفعة مؤكَّدة من Chargily (لا يرمي أبدًا). */
export async function notifyAdminsPaid(email: string, amount: number) {
  try {
    const admins = await adminIdsWhere("staff", "admin");
    const n = new Intl.NumberFormat("fr-DZ").format(amount);
    await Promise.all(
      admins.map((uid) =>
        sendToUser(uid, {
          ar: { title: `💳 دفعة جديدة: ${n} دج`, body: email, link: "/admin/payments", tag: "payment" },
          fr: { title: `💳 Nouveau paiement : ${n} DA`, body: email, link: "/admin/payments", tag: "payment" },
        }),
      ),
    );
  } catch (e) {
    console.error("[notify admins]", e);
  }
}
