import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { driveKey, fetchDriveMedia, fetchPublicDriveFile, libraryFile } from "@/lib/server/drive";
import { SOURCE_FILE_IDS } from "@/features/admin/curriculum-catalog";

/* ملف من مجلد المكتبة على Drive عبر الخادم — للمحرّرين والأدمن فقط، لنشر المذكرات من المتصفح (Drive يمنع
   تحميل ملفاته مباشرة من صفحة أخرى: CORS). المسموح: ملفات المصادر المعلنة في المناهج، أو (بمفتاح Drive API)
   أي ملف داخل مجلد المكتبة. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    if (!user.roles.admin && !user.roles.contentEditor) throw new HttpError(403, "forbidden");
    const id = new URL(req.url).searchParams.get("id") ?? "";
    if (!/^[A-Za-z0-9_-]{10,80}$/.test(id)) throw new HttpError(400, "bad id");
    const hasKey = await driveKey().then(() => true, () => false);
    let res: Response;
    if (SOURCE_FILE_IDS.has(id)) {
      res = hasKey ? await fetchDriveMedia(id).catch(() => fetchPublicDriveFile(id)) : await fetchPublicDriveFile(id);
    } else {
      if (!hasKey) throw new HttpError(403, "not a declared source");
      await libraryFile(id);
      res = await fetchDriveMedia(id);
    }
    return new Response(res.body, {
      headers: { "Content-Type": res.headers.get("content-type") ?? "application/octet-stream", "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
