import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { adminCommit, newId } from "@/lib/server/firestore-admin";
import { forgetStoredGemini, geminiEnv } from "@/lib/server/gemini-env";

/* مفتاح Gemini من لوحة الأدمن: يُحفظ في serverSecrets/gemini (يقرؤه الخادم وحده) بعد التحقق منه عند Google.
   لا يُعاد المفتاح أبدًا إلى المتصفح. */
async function requireAdmin(req: Request) {
  const user = await requireUser(req);
  if (!user.roles.admin) throw new HttpError(403, "forbidden");
  return user;
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const { key, source, model } = await geminiEnv();
    return Response.json({ configured: !!key, source, model, hint: key ? `…${key.slice(-4)}` : null });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin(req);
    const body = (await req.json().catch(() => null)) as { key?: unknown } | null;
    const key = typeof body?.key === "string" ? body.key.trim() : "";
    if (!/^[\w.-]{20,200}$/.test(key)) throw new HttpError(400, "invalid key");
    // التحقق من المفتاح عند Google قبل الحفظ (قائمة النماذج لا تستهلك من الحصة)
    const check = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", { headers: { "x-goog-api-key": key } });
    if (!check.ok) throw new HttpError(422, "key rejected");
    await adminCommit([
      { path: "serverSecrets/gemini", data: { key, updatedAt: new Date(), updatedBy: user.uid } },
      { path: `auditLogs/${newId()}`, data: { action: "ai.key", uid: user.uid, at: new Date() }, precondition: { exists: false } },
    ]);
    forgetStoredGemini();
    return Response.json({ configured: true, hint: `…${key.slice(-4)}` });
  } catch (error) {
    return errorResponse(error);
  }
}
