import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { adminCommit, adminGet, newId } from "@/lib/server/firestore-admin";
import { effectivePlan, renewEnd, type Entitlement, type Plan } from "@/shared/billing/plans";

/* بدء التجربة المجانية: مرة واحدة لكل حساب، ببريد مؤكّد، ومدتها من إعدادات الأدمن.
   الكتابة ذرّية بشرط مسبق على نسخة وثيقة الاشتراك: طلبان متزامنان لا يمنحان تجربتين. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user.emailVerified) throw new HttpError(403, "email not verified");

    const config = (await adminGet("config/app"))?.data ?? {};
    const days = Number(config.trialDays);
    const planId = typeof config.trialPlanId === "string" ? config.trialPlanId : "premium";
    if (!Number.isInteger(days) || days < 1 || days > 90) throw new HttpError(503, "trial unavailable");

    const plan = (await adminGet(`plans/${planId}`))?.data as Partial<Plan> | undefined;
    if (!plan || plan.active === false || !plan.trialEligible) throw new HttpError(503, "trial unavailable");

    const current = await adminGet(`entitlements/${user.uid}`);
    const ent = (current?.data ?? null) as Partial<Entitlement> | null;
    if (typeof ent?.trialUsedAt === "number") throw new HttpError(409, "trial used");
    const now = Date.now();
    if (effectivePlan(ent, null, now).status !== "free") throw new HttpError(409, "already subscribed");

    const end = renewEnd(null, now, days);
    await adminCommit([
      {
        path: `entitlements/${user.uid}`,
        data: {
          planId,
          status: "trial",
          currentPeriodEnd: new Date(end),
          limits: { maxClasses: Number(plan.limits?.maxClasses ?? 0) },
          features: plan.features ?? [],
          contentAccess: plan.contentAccess ?? "premium",
          trialUsedAt: new Date(now),
          source: "trial",
          updatedAt: new Date(now),
        },
        precondition: current ? { updateTime: current.updateTime } : { exists: false },
      },
      {
        path: `auditLogs/${newId()}`,
        data: { action: "trial.start", uid: user.uid, planId, days, at: new Date(now) },
        precondition: { exists: false },
      },
    ]);
    return Response.json({ planId, currentPeriodEnd: end });
  } catch (error) {
    return errorResponse(error);
  }
}
