import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { fetchDriveMedia, libraryFile } from "@/lib/server/drive";

/* ملف من مجلد المكتبة على Drive عبر الخادم (مفتاح Drive API) — للمحرّرين والأدمن فقط، وللملفات داخل المجلد فقط.
   يستعمله نشر المذكرات من المتصفح حين يتعذّر التحميل المباشر من Drive. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user.roles.admin && !user.roles.contentEditor) throw new HttpError(403, "forbidden");
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!/^[A-Za-z0-9_-]{10,80}$/.test(id)) throw new HttpError(400, "bad id");
    const file = await libraryFile(id);
    const res = await fetchDriveMedia(id);
    return new Response(res.body, { headers: { "Content-Type": file.mime || "application/octet-stream", "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
