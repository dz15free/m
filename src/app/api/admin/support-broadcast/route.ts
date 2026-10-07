import { z } from "zod";
import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { adminCommit, adminListAll, newId, type Write } from "@/lib/server/firestore-admin";
import { sendToTopic } from "@/lib/server/push";

const Body = z.object({
  text: z.string().trim().min(1).max(2000),
  audience: z.enum(["all", "paid", "trial", "free", "failed"]),
  dryRun: z.boolean().default(false),
});

/* رسالة خاصة لكل أستاذ في محادثته مع الإدارة (لا إشعارًا عامًا): كل واحد يراها وحده ويرد عليها.
   «{name}» في النص يُستبدل باسم الأستاذ. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user.roles.admin) throw new HttpError(403, "forbidden");
    const { text, audience, dryRun } = Body.parse(await req.json().catch(() => ({})));

    const users = await adminListAll("users", ["displayName", "email"]);
    let targets = users;
    if (audience !== "all") {
      const now = Date.now();
      const ents = await adminListAll("entitlements", ["status", "currentPeriodEnd"]);
      const live = new Map(ents.filter((e) => Number(e.data.currentPeriodEnd) > now).map((e) => [e.id, String(e.data.status)]));
      if (audience === "paid") targets = users.filter((u) => live.get(u.id) === "active");
      else if (audience === "trial") targets = users.filter((u) => live.get(u.id) === "trial");
      else if (audience === "free") targets = users.filter((u) => !live.has(u.id));
      else {
        // حاولوا الدفع ولم ينجح ولا اشتراك ساريًا لهم
        const orders = await adminListAll("orders", ["uid", "status"]);
        const tried = new Set(orders.filter((o) => o.data.status !== "paid").map((o) => String(o.data.uid)));
        targets = users.filter((u) => tried.has(u.id) && live.get(u.id) !== "active");
      }
    }
    if (dryRun) return Response.json({ count: targets.length });

    const now = new Date();
    const writes: Write[] = targets.flatMap((u) => {
      const name = String(u.data.displayName ?? "").slice(0, 130);
      const body = text.replaceAll("{name}", name || "أستاذ").slice(0, 2000);
      return [
        { path: `supportThreads/${u.id}/messages/${newId()}`, data: { from: "admin", text: body, at: now } },
        {
          path: `supportThreads/${u.id}`,
          data: { uid: u.id, name, email: String(u.data.email ?? "").slice(0, 200), lastMessage: body.slice(0, 140), lastMessageAt: now, lastFrom: "admin", unreadTeacher: true, status: "open" },
          merge: true,
        },
      ];
    });
    for (let i = 0; i < writes.length; i += 400) await adminCommit(writes.slice(i, i + 400));
    // إشعار هاتف واحد عام (لا إشعار لكل أستاذ) حين تشمل الرسالة الجميع
    if (audience === "all") {
      await Promise.all([
        sendToTopic("all_ar", { title: "رسالة جديدة من الإدارة", body: text.replaceAll("{name}", "").slice(0, 140), link: "/app?support=1", tag: "support" }),
        sendToTopic("all_fr", { title: "Nouveau message de l'administration", body: text.replaceAll("{name}", "").slice(0, 140), link: "/app?support=1", tag: "support" }),
      ]).catch(() => {});
    }
    await adminCommit([{ path: `auditLogs/${newId()}`, data: { action: "support.broadcast", by: user.uid, audience, count: targets.length, at: now } }]);
    return Response.json({ count: targets.length });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "bad request" }, { status: 400 });
    return errorResponse(error);
  }
}
