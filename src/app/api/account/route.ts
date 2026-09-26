import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { adminCommit, adminDelete, adminDeleteTree, newId } from "@/lib/server/firestore-admin";
import { deleteAccount } from "@/lib/server/identity";

const RECENT_LOGIN_S = 15 * 60;

/* حذف الحساب نهائيًا بطلب صاحبه: كل بيانات الأستاذ (الأقسام، التلاميذ، الحضور، الدفاتر…)،
   المحادثة مع الإدارة، الاشتراك، ثم حساب الدخول. تبقى سجلات الدفع وحدها (إلزام قانوني)،
   ويُكتب أثر في سجل العمليات بلا أي بيانات شخصية. يتطلّب تسجيل دخول حديثًا. */
export async function DELETE(req: Request) {
  try {
    const user = await requireUser(req);
    if (Date.now() / 1000 - user.authTime > RECENT_LOGIN_S) throw new HttpError(401, "recent login required");
    if (user.roles.admin) throw new HttpError(409, "admin account");

    await adminDeleteTree(`teachers/${user.uid}`);
    await adminDeleteTree(`supportThreads/${user.uid}`);
    await adminDelete([`users/${user.uid}`, `entitlements/${user.uid}`, `checkoutLimits/${user.uid}`, `supportNotify/${user.uid}`]);
    await deleteAccount(user.uid);
    await adminCommit([{ path: `auditLogs/delete_${newId()}`, data: { action: "account.delete", uid: user.uid, at: new Date() } }]);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
