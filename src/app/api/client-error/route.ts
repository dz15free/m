import { z } from "zod";
import { errorResponse, requireUser } from "@/lib/server/auth";
import { adminCommit, newId } from "@/lib/server/firestore-admin";

const Body = z.object({
  where: z.string().max(60),
  message: z.string().max(500),
  stack: z.string().max(1500).default(""),
  extra: z.record(z.string().max(40), z.union([z.string().max(200), z.number()])).default({}),
});

/* أخطاء ميدانية من أجهزة الأساتذة (قراءة ملف، OCR…) لتشخيصها. تُكتب للخادم وحده
   (القواعد تمنع القراءة من المتصفح)، بلا أي بيانات تلاميذ: الرسالة التقنية ونوع الجهاز فقط. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = Body.parse(await req.json().catch(() => ({})));
    await adminCommit([
      {
        path: `clientErrors/${newId()}`,
        data: { ...body, uid: user.uid, ua: (req.headers.get("user-agent") ?? "").slice(0, 300), at: new Date() },
      },
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "bad request" }, { status: 400 });
    return errorResponse(error);
  }
}
