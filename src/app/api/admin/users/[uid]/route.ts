import { z } from "zod";
import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { activationWrites, notifyActivated } from "@/lib/server/activation";
import { adminCommit, adminDelete, adminGet, newId } from "@/lib/server/firestore-admin";
import { getAccount, setRoles } from "@/lib/server/identity";

/* إدارة أستاذ من لوحة الأدمن: قراءة الحساب والأدوار، تفعيل Premium يدويًا
   (دفعة متفق عليها عبر التواصل)، إلغاء الاشتراك، وتعديل الأدوار. للأدمن وحده. */

async function requireAdmin(req: Request) {
  const user = await requireUser(req);
  if (!user.roles.admin) throw new HttpError(403, "forbidden");
  return user;
}

const uidOk = (uid: string) => /^[\w-]{1,128}$/.test(uid);

export async function GET(req: Request, { params }: RouteContext<"/api/admin/users/[uid]">) {
  try {
    await requireAdmin(req);
    const { uid } = await params;
    if (!uidOk(uid)) throw new HttpError(404, "not found");
    const account = await getAccount(uid);
    if (!account) throw new HttpError(404, "not found");
    return Response.json(account, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("grant"), planId: z.string().regex(/^[a-z0-9_-]{1,32}$/), days: z.number().int().min(1).max(3660), amount: z.number().int().min(0).max(10_000_000), note: z.string().trim().max(200).default("") }),
  z.object({ action: z.literal("revoke"), note: z.string().trim().max(200).default("") }),
  z.object({ action: z.literal("roles"), roles: z.object({ admin: z.boolean(), contentEditor: z.boolean(), finance: z.boolean() }) }),
]);

export async function POST(req: Request, { params }: RouteContext<"/api/admin/users/[uid]">) {
  try {
    const admin = await requireAdmin(req);
    const { uid } = await params;
    if (!uidOk(uid)) throw new HttpError(404, "not found");
    const body = Body.parse(await req.json().catch(() => ({})));
    const now = Date.now();

    if (body.action === "grant") {
      const id = `admin_${newId()}`;
      const { writes, until } = await activationWrites(
        { uid, planId: body.planId, paymentId: id, method: "admin", gross: body.amount, fees: 0, sourceId: admin.uid, days: body.days },
        now,
      );
      // بلا مبلغ: لا يُحتسب في الإيرادات (هدية/تعويض)
      const kept = body.amount > 0 ? writes : writes.filter((w) => !w.path.startsWith("stats/") && !w.path.startsWith("payments/"));
      await adminCommit([...kept, { path: `auditLogs/grant_${id}`, data: { action: "admin.grant", uid, by: admin.uid, days: body.days, amount: body.amount, note: body.note, at: new Date(now) } }]);
      await notifyActivated(uid, until);
      return Response.json({ until });
    }

    if (body.action === "revoke") {
      const current = await adminGet(`entitlements/${uid}`);
      if (!current) return Response.json({ ok: true });
      await adminCommit([
        {
          path: `entitlements/${uid}`,
          data: { status: "free", currentPeriodEnd: null, source: "admin", updatedAt: new Date(now) },
          merge: true,
          precondition: { updateTime: current.updateTime },
        },
        { path: `auditLogs/revoke_${newId()}`, data: { action: "admin.revoke", uid, by: admin.uid, note: body.note, at: new Date(now) } },
      ]);
      return Response.json({ ok: true });
    }

    // الأدوار: لا يُسقط الأدمن صلاحيته عن نفسه (تجنّب إغلاق اللوحة على الجميع)
    if (uid === admin.uid && !body.roles.admin) throw new HttpError(409, "cannot remove own admin");
    await setRoles(uid, body.roles);
    // قائمة الطاقم للخادم (مستقبلو إشعار رسائل الأساتذة)
    if (Object.values(body.roles).some(Boolean)) await adminCommit([{ path: `staff/${uid}`, data: body.roles }]);
    else await adminDelete([`staff/${uid}`]);
    await adminCommit([{ path: `auditLogs/roles_${newId()}`, data: { action: "admin.roles", uid, by: admin.uid, roles: body.roles, at: new Date(now) } }]);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "bad request" }, { status: 400 });
    return errorResponse(error);
  }
}
