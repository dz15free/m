import { z } from "zod";
import { errorResponse, HttpError, requireUser, usingEmulators } from "@/lib/server/auth";
import { chargilyMode, createCheckout } from "@/lib/server/chargily";
import { siteUrl } from "@/lib/server/env";
import { adminCommit, adminGet, newId } from "@/lib/server/firestore-admin";
import type { Plan } from "@/shared/billing/plans";

const Body = z.object({ planId: z.string().regex(/^[a-z0-9_-]{1,32}$/), locale: z.enum(["ar", "fr"]).default("ar") });
const MAX_PER_HOUR = 5;
const MIN_AMOUNT = 50; // أدنى مبلغ يقبله Chargily بالدينار

/* بدء دفع بـ Chargily. المستخدم من الرمز والسعر من القاعدة — لا شيء من جسم الطلب يحدد المبلغ. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const { planId, locale } = Body.parse(await req.json().catch(() => ({})));

    const plan = (await adminGet(`plans/${planId}`))?.data as Partial<Plan> | undefined;
    const amount = Number(plan?.priceDzd);
    if (!plan?.active || !Number.isInteger(amount) || amount < MIN_AMOUNT || !plan.durationDays) throw new HttpError(409, "plan unavailable");

    // حدّ المعدل: 5 محاولات دفع في الساعة لكل مستخدم
    const now = Date.now();
    const hour = new Date(now).toISOString().slice(0, 13);
    const limit = await adminGet(`checkoutLimits/${user.uid}`);
    const count = limit?.data.hour === hour ? Number(limit.data.count ?? 0) : 0;
    if (count >= MAX_PER_HOUR) throw new HttpError(429, "too many attempts");

    const orderId = newId();
    const mode = chargilyMode();
    await adminCommit([
      {
        path: `orders/${orderId}`,
        data: { uid: user.uid, email: user.email ?? "", planId, amount, currency: "dzd", method: "chargily", mode, status: "pending", createdAt: new Date(now) },
        precondition: { exists: false },
      },
      {
        path: `checkoutLimits/${user.uid}`,
        data: { hour, count: count + 1 },
        precondition: limit ? { updateTime: limit.updateTime } : { exists: false },
      },
    ]);

    // في التطوير نعود إلى نفس الخادم المحلي؛ في الإنتاج إلى prof.baczone.app
    const base = usingEmulators() ? new URL(req.url).origin : siteUrl();
    try {
      const checkout = await createCheckout({
        amount,
        successUrl: `${base}/app/billing/return?order=${orderId}`,
        failureUrl: `${base}/app/billing/return?order=${orderId}&failed=1`,
        webhookUrl: `${base}/api/webhooks/chargily`,
        locale,
        description: `${plan.name?.[locale] ?? planId} — prof.baczone.app`,
        metadata: { orderId, app: "prof" },
      });
      await adminCommit([{ path: `orders/${orderId}`, data: { checkoutId: checkout.id }, merge: true }]);
      return Response.json({ orderId, checkoutUrl: checkout.checkoutUrl });
    } catch (e) {
      await adminCommit([{ path: `orders/${orderId}`, data: { status: "failed" }, merge: true }]).catch(() => {});
      throw e;
    }
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "bad request" }, { status: 400 });
    return errorResponse(error);
  }
}
