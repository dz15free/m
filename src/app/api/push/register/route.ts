import { z } from "zod";
import { errorResponse, requireUser } from "@/lib/server/auth";
import { saveToken, subscribeToTopic, topicFor } from "@/lib/server/push";

const Body = z.object({ token: z.string().min(20).max(4096), locale: z.enum(["ar", "fr"]).default("ar") });

/* تسجيل جهاز لإشعارات الهاتف: حفظ رمزه للأستاذ واشتراكه في إعلانات لغته. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const { token, locale } = Body.parse(await req.json().catch(() => ({})));
    await saveToken(user.uid, token, locale, req.headers.get("user-agent") ?? "");
    await subscribeToTopic(token, topicFor(locale));
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "bad request" }, { status: 400 });
    return errorResponse(error);
  }
}
