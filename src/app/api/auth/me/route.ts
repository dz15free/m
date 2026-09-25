import { errorResponse, requireUser } from "@/lib/server/auth";

/** يعيد هوية المستخدم كما يراها الخادم — للتحقق من سلسلة المصادقة كاملة. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return Response.json(user, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
