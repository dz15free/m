import { z } from "zod";
import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { activationWrites } from "@/lib/server/activation";
import { adminCommit, adminGet } from "@/lib/server/firestore-admin";

const Body = z.object({ decision: z.enum(["approve", "reject"]), note: z.string().trim().max(300).default("") });

/* قبول أو رفض دفعة يدوية (المالية/الأدمن). القبول يفعّل الاشتراك في نفس commit ذرّي،
   بشرط مسبق على نسخة الطلب: لا يُقبل الطلب مرتين ولو ضغط مراجعان معًا. */
export async function POST(req: Request, { params }: RouteContext<"/api/admin/payments/[id]/review">) {
  try {
    const user = await requireUser(req);
    if (!user.roles.admin && !user.roles.finance) throw new HttpError(403, "forbidden");
    const { id } = await params;
    if (!/^[\w-]{1,40}$/.test(id)) throw new HttpError(404, "not found");
    const { decision, note } = Body.parse(await req.json().catch(() => ({})));
    if (decision === "reject" && !note) throw new HttpError(400, "note required");

    const mp = await adminGet(`manualPayments/${id}`);
    if (!mp) throw new HttpError(404, "not found");
    const d = mp.data as { uid: string; planId: string; declaredAmount: number; method: "baridimob" | "ccp"; status: string };
    if (d.status !== "pending") throw new HttpError(409, "already reviewed");

    const now = Date.now();
    const review = {
      path: `manualPayments/${id}`,
      data: { status: decision === "approve" ? "approved" : "rejected", adminNote: note, reviewedBy: user.uid, reviewedAt: new Date(now) },
      merge: true,
      precondition: { updateTime: mp.updateTime },
    };
    if (decision === "reject") {
      await adminCommit([review, { path: `auditLogs/reject_${id}`, data: { action: "payment.reject", id, uid: d.uid, by: user.uid, note, at: new Date(now) } }]);
      return Response.json({ status: "rejected" });
    }
    const { writes, until } = await activationWrites(
      { uid: d.uid, planId: d.planId, paymentId: `manual_${id}`, method: d.method, gross: d.declaredAmount, fees: 0, sourceId: id },
      now,
    );
    await adminCommit([review, ...writes]);
    return Response.json({ status: "approved", until });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "bad request" }, { status: 400 });
    return errorResponse(error);
  }
}
