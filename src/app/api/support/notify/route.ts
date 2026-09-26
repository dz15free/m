import { errorResponse, requireUser } from "@/lib/server/auth";
import { adminCommit, adminGet, adminIdsWhere } from "@/lib/server/firestore-admin";
import { sendToUser } from "@/lib/server/push";

const QUIET_MS = 10 * 60_000;

/* إشعار هاتف للأدمن حين يراسل أستاذ الإدارة. نقرأ الملخص من المحادثة نفسها (لا من الطلب)،
   ولا نرسل أكثر من إشعار كل 10 دقائق لنفس الأستاذ حتى لا تُغرق الرسائل المتتالية هاتف الأدمن. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const thread = await adminGet(`supportThreads/${user.uid}`);
    if (!thread || thread.data.lastFrom !== "teacher") return Response.json({ ok: true });

    const now = Date.now();
    const last = await adminGet(`supportNotify/${user.uid}`);
    const lastAt = last?.data.at instanceof Date ? last.data.at.getTime() : Number(last?.data.at ?? 0);
    if (now - lastAt < QUIET_MS) return Response.json({ ok: true, throttled: true });
    await adminCommit([{ path: `supportNotify/${user.uid}`, data: { at: new Date(now) } }]);

    const name = String(thread.data.name || thread.data.email || "");
    const preview = String(thread.data.lastMessage ?? "");
    const link = `/admin/support?uid=${encodeURIComponent(user.uid)}`;
    const admins = await adminIdsWhere("staff", "admin");
    await Promise.all(
      admins.map((uid) =>
        sendToUser(uid, {
          ar: { title: `رسالة جديدة من ${name}`.trim(), body: preview, link, tag: `support-${user.uid}` },
          fr: { title: `Nouveau message de ${name}`.trim(), body: preview, link, tag: `support-${user.uid}` },
        }),
      ),
    );
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
