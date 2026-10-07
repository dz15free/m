import { z } from "zod";
import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { getCheckoutInfo } from "@/lib/server/chargily";
import { adminCommit, adminGet } from "@/lib/server/firestore-admin";

const Body = z.object({ orderId: z.string().regex(/^[\w-]{1,40}$/) });

/* تفاصيل محاولة دفع من Chargily مباشرة: الحالة، وسيلة الدفع، والزبون (الاسم والبريد والهاتف كما كتبها).
   تُحفظ في الطلب (orders/{id}.chargily) ليراها الأدمن لاحقًا دون طلب جديد. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user.roles.admin && !user.roles.finance) throw new HttpError(403, "forbidden");
    const { orderId } = Body.parse(await req.json().catch(() => ({})));
    const order = await adminGet(`orders/${orderId}`);
    if (!order) throw new HttpError(404, "order not found");
    const checkoutId = String(order.data.checkoutId ?? "");
    if (!checkoutId) return Response.json({ info: null, note: "no checkout" });
    const info = await getCheckoutInfo(checkoutId);
    if (info) await adminCommit([{ path: `orders/${orderId}`, data: { chargily: { ...info, checkedAt: new Date() } }, merge: true }]);
    return Response.json({ info });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "bad request" }, { status: 400 });
    return errorResponse(error);
  }
}
