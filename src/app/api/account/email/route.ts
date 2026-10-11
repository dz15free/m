import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { adminCommit, adminGet } from "@/lib/server/firestore-admin";

/* بعد أن يغيّر الأستاذ بريده (رابط التأكيد في البريد الجديد): نسخة البريد في users/{uid} ثابتة في القواعد،
   فيحدّثها الخادم من رمز الهوية نفسه — بريد مؤكَّد فقط، ولا شيء غيره. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user.email || !user.emailVerified) throw new HttpError(400, "email not verified");
    const doc = await adminGet(`users/${user.uid}`);
    if (!doc) throw new HttpError(404, "no user doc");
    if (doc.data.email !== user.email) {
      await adminCommit([{ path: `users/${user.uid}`, data: { email: user.email, updatedAt: new Date() }, merge: true, precondition: { exists: true } }]);
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
