import { z } from "zod";
import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { adminCommit } from "@/lib/server/firestore-admin";
import { messageNoticeWrites, sendToUser } from "@/lib/server/push";

const Body = z.object({ uid: z.string().regex(/^[\w-]{1,128}$/), preview: z.string().max(140).default("") });

/* حين تراسل الإدارة أستاذًا: إشعار في جرس التطبيق + إشعار هاتف لأجهزته. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user.roles.admin) throw new HttpError(403, "forbidden");
    const { uid, preview } = Body.parse(await req.json().catch(() => ({})));
    await adminCommit(messageNoticeWrites(uid, preview)).catch((e) => console.error("[support-notify] bell", e));
    await sendToUser(uid, {
      ar: { title: "رد جديد من الإدارة", body: preview, link: "/app?support=1", tag: "support" },
      fr: { title: "Nouvelle réponse de l'administration", body: preview, link: "/app?support=1", tag: "support" },
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "bad request" }, { status: 400 });
    return errorResponse(error);
  }
}
