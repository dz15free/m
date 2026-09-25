import { z } from "zod";
import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { sendToUser } from "@/lib/server/push";

const Body = z.object({ uid: z.string().regex(/^[\w-]{1,128}$/), preview: z.string().max(140).default("") });

/* إشعار هاتف للأستاذ حين ترد الإدارة على رسالته. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user.roles.admin) throw new HttpError(403, "forbidden");
    const { uid, preview } = Body.parse(await req.json().catch(() => ({})));
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
