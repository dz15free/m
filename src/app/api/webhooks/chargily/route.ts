import { HttpError } from "@/lib/server/auth";
import { activationWrites } from "@/lib/server/activation";
import { verifySignature } from "@/lib/server/chargily";
import { adminCommit, adminGet, type Write } from "@/lib/server/firestore-admin";

type Checkout = {
  id: string;
  amount: number;
  currency: string;
  fees?: number;
  pass_fees_to_customer?: boolean | number;
  livemode?: boolean;
  metadata?: { orderId?: string; app?: string } | null;
};
type Event = { id: string; type: string; livemode?: boolean; data: Checkout };

const ok = (note: string) => Response.json({ ok: true, note });

/* Webhook Chargily. لا نثق بشيء قبل التوقيع؛ ونعالج كل حدث مرة واحدة فقط ذرّيًا
   (إنشاء webhookEvents/{id} بشرط «غير موجود» في نفس commit التفعيل). */
export async function POST(req: Request) {
  const raw = await req.text();
  try {
    if (!(await verifySignature(raw, req.headers.get("signature")))) return Response.json({ error: "bad signature" }, { status: 403 });
  } catch {
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  let event: Event;
  try {
    event = JSON.parse(raw) as Event;
  } catch {
    return Response.json({ error: "bad payload" }, { status: 400 });
  }
  const c = event.data;
  const orderId = c?.metadata?.orderId;
  if (!event.id || !/^[\w-]{1,100}$/.test(event.id) || !orderId || c.metadata?.app !== "prof" || !/^[\w-]{1,40}$/.test(orderId)) {
    return ok("ignored");
  }
  const kind = event.type === "checkout.paid" ? "paid" : ["checkout.failed", "checkout.canceled", "checkout.expired"].includes(event.type) ? "failed" : null;
  if (!kind) return ok("ignored type");

  const eventPath = `webhookEvents/${event.id}`;
  try {
    if (await adminGet(eventPath)) return ok("duplicate");
    const order = await adminGet(`orders/${orderId}`);
    if (!order) return ok("unknown order");
    const o = order.data as { uid: string; planId: string; amount: number; mode: string; status: string };
    const now = Date.now();
    const eventWrite: Write = { path: eventPath, data: { type: event.type, orderId, at: new Date(now) }, precondition: { exists: false } };
    const orderWrite = (data: Record<string, unknown>): Write => ({
      path: `orders/${orderId}`,
      data: { ...data, updatedAt: new Date(now) },
      merge: true,
      precondition: { updateTime: order.updateTime },
    });

    if (o.status !== "pending") {
      await adminCommit([eventWrite]);
      return ok("already settled");
    }

    if (kind === "failed") {
      await adminCommit([orderWrite({ status: "failed", checkoutId: c.id }), eventWrite]);
      return ok("failed");
    }

    // دفعة ناجحة: المبلغ والعملة والوضع يجب أن تطابق الطلب
    const live = event.livemode ?? c.livemode;
    if (Number(c.amount) !== o.amount || String(c.currency).toLowerCase() !== "dzd" || (typeof live === "boolean" && live !== (o.mode === "live"))) {
      await adminCommit([
        orderWrite({ status: "mismatch", checkoutId: c.id }),
        eventWrite,
        { path: `auditLogs/mismatch_${orderId}`, data: { action: "payment.mismatch", orderId, got: Number(c.amount), expected: o.amount, at: new Date(now) } },
      ]);
      return ok("mismatch");
    }

    const fees = Number(c.fees ?? 0) || 0;
    const { writes, until } = await activationWrites(
      {
        uid: o.uid,
        planId: o.planId,
        paymentId: `chargily_${orderId}`,
        method: "chargily",
        gross: o.amount,
        fees,
        feesPassedToCustomer: !!c.pass_fees_to_customer,
        sourceId: orderId,
      },
      now,
    );
    await adminCommit([orderWrite({ status: "paid", checkoutId: c.id, fees, paidAt: new Date(now), periodEnd: new Date(until) }), eventWrite, ...writes]);
    return ok("activated");
  } catch (error) {
    // تزامن مع نسخة أخرى من نفس الحدث: إن سُجّل الحدث فقد عولج، وإلا نطلب إعادة الإرسال
    if (error instanceof HttpError && error.status === 409 && (await adminGet(eventPath).catch(() => null))) return ok("duplicate");
    console.error("[chargily webhook]", error);
    return Response.json({ error: "retry" }, { status: 500 });
  }
}
