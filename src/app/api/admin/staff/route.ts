import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { adminList } from "@/lib/server/firestore-admin";
import { getAccount } from "@/lib/server/identity";

/* فريق الإدارة: من لديه دور (أدمن، محرّر، مالية) مع بريده. الأدوار من حساب الدخول نفسه (المصدر الحقيقي). */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user.roles.admin) throw new HttpError(403, "forbidden");
    const staff = await adminList("staff");
    const rows = await Promise.all(
      staff.map(async (s) => {
        const acc = await getAccount(s.id).catch(() => null);
        return acc ? { uid: s.id, email: acc.email, roles: acc.roles } : null;
      }),
    );
    return Response.json(
      rows.filter((r) => r && Object.values(r.roles).some(Boolean)),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
