/* الخطط والاشتراك — منطق مشترك بين الواجهة والخادم (والقواعد تطبّق نفس الشرط).
   لا أسماء خطط ولا أسعار في الكود: كلها في `plans/{id}` و`config/app` يضبطها الأدمن.
   الانتهاء «كسول»: لا مهمة مجدولة؛ اشتراك انتهى تاريخه = مجاني فعليًا، ولا تُحذف أي بيانات. */

export type PlanLimits = { maxClasses: number };
export type ContentAccess = "free" | "premium";

export type Plan = {
  id: string;
  name: { ar: string; fr: string };
  description: { ar: string; fr: string };
  priceDzd: number;
  durationDays: number;
  limits: PlanLimits;
  features: string[];
  contentAccess: ContentAccess;
  trialEligible: boolean;
  active: boolean;
  order: number;
};

export type EntitlementStatus = "free" | "trial" | "active";

export type Entitlement = {
  planId: string;
  status: EntitlementStatus;
  currentPeriodEnd: number | null; // ms
  limits: PlanLimits;
  features: string[];
  contentAccess: ContentAccess;
  trialUsedAt: number | null; // ms
  source: "trial" | "chargily" | "manual" | "admin";
};

export type Banner = {
  enabled: boolean;
  text: { ar: string; fr: string };
  link: string;
  tone: "info" | "success" | "warning" | "promo";
  /** يتغير مع كل تعديل لتظهر النسخة الجديدة حتى لمن أغلق السابقة */
  version: number;
};

export type AppConfig = {
  trialDays: number;
  trialPlanId: string;
  contact?: { whatsapp?: string; email?: string; hours?: { ar: string; fr: string } };
  banner?: Banner;
};

/** قيم احتياطية إن لم تُضبط وثيقة `plans/free` بعد (القرار المعتمد: قسمان). */
export const FREE_FALLBACK: Pick<Plan, "limits" | "features" | "contentAccess"> = {
  limits: { maxClasses: 2 },
  features: [],
  contentAccess: "free",
};

const DAY = 86_400_000;

export type Effective = {
  planId: string;
  status: EntitlementStatus;
  limits: PlanLimits;
  features: string[];
  contentAccess: ContentAccess;
  endsAt: number | null;
  daysLeft: number | null;
  /** كان مشتركًا وانتهى (لعرض «انتهى اشتراكك») */
  expired: boolean;
  trialUsed: boolean;
};

export function effectivePlan(ent: Partial<Entitlement> | null, freePlan: Partial<Plan> | null, now = Date.now()): Effective {
  const free = {
    limits: { maxClasses: freePlan?.limits?.maxClasses ?? FREE_FALLBACK.limits.maxClasses },
    features: freePlan?.features ?? FREE_FALLBACK.features,
    contentAccess: FREE_FALLBACK.contentAccess,
  };
  const trialUsed = typeof ent?.trialUsedAt === "number";
  const paid = (ent?.status === "trial" || ent?.status === "active") && typeof ent.currentPeriodEnd === "number";
  if (paid && ent!.currentPeriodEnd! > now) {
    return {
      planId: ent!.planId ?? "premium",
      status: ent!.status!,
      limits: { maxClasses: Math.max(ent!.limits?.maxClasses ?? 0, free.limits.maxClasses) },
      features: ent!.features ?? [],
      contentAccess: ent!.contentAccess ?? "premium",
      endsAt: ent!.currentPeriodEnd!,
      daysLeft: Math.ceil((ent!.currentPeriodEnd! - now) / DAY),
      expired: false,
      trialUsed,
    };
  }
  return { planId: "free", status: "free", ...free, endsAt: null, daysLeft: null, expired: paid, trialUsed };
}

/** التجديد المبكر لا يضيّع أيامًا: نبدأ من نهاية الفترة الحالية إن كانت في المستقبل. */
export function renewEnd(currentEnd: number | null, now: number, days: number): number {
  return Math.max(now, currentEnd ?? 0) + days * DAY;
}

export const hasFeature = (e: Effective, key: string) => e.features.includes(key);

/** صافي الدفعة: إن حُمّلت الرسوم على الزبون فالمبلغ كله صافٍ. */
export function netOf(amount: number, fees: number, feesPassedToCustomer: boolean): number {
  return feesPassedToCustomer ? amount : Math.max(0, amount - fees);
}

/** شهر الإيرادات (توقيت الجزائر) لمفتاح stats/revenue_{YYYY-MM}. */
export const revenueMonth = (t: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Algiers", year: "numeric", month: "2-digit" }).format(new Date(t));

/** مرجع دفع قصير يكتبه الأستاذ في ملاحظة الحوالة (بلا أحرف ملتبسة). */
export function payRef(random: Uint8Array): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  return `P-${Array.from(random.slice(0, 5), (b) => alphabet[b % alphabet.length]).join("")}`;
}
