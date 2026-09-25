import { z } from "zod";
import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { adminCommit, newId } from "@/lib/server/firestore-admin";
import { sendToTopic } from "@/lib/server/push";

const L = (max: number) => z.object({ ar: z.string().trim().max(max), fr: z.string().trim().max(max) });
const Body = z.object({
  title: L(140),
  body: L(1000),
  link: z.string().trim().max(300).default(""),
  kind: z.enum(["news", "update", "content", "offer"]),
});

/* نشر إشعار عام: يُكتب للجميع في التطبيق (الجرس) ويُرسل إلى الهواتف المشتركة بلغتيها.
   الأدمن ينشر أي نوع؛ المحرّر ينشر «محتوى جديد» فقط. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const a = Body.parse(await req.json().catch(() => ({})));
    if (!user.roles.admin && !(user.roles.contentEditor && a.kind === "content")) throw new HttpError(403, "forbidden");
    if (!a.title.ar && !a.title.fr) throw new HttpError(400, "title required");
    if (a.link && !a.link.startsWith("/") && !/^https:\/\//.test(a.link)) throw new HttpError(400, "bad link");

    const now = new Date();
    await adminCommit([
      { path: `announcements/${newId()}`, data: { ...a, createdAt: now, createdBy: user.uid } },
      { path: "config/app", data: { latestAnnouncementAt: now }, merge: true },
    ]);
    const link = a.link.startsWith("/") ? a.link : "/app";
    await Promise.all([
      a.title.ar && sendToTopic("all_ar", { title: a.title.ar, body: a.body.ar, link, tag: "announcement" }),
      (a.title.fr || a.title.ar) && sendToTopic("all_fr", { title: a.title.fr || a.title.ar, body: a.body.fr || a.body.ar, link, tag: "announcement" }),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "bad request" }, { status: 400 });
    return errorResponse(error);
  }
}
