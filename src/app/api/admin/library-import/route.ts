import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { contentBucket } from "@/lib/server/storage";
import { fetchDriveMedia, libraryFile } from "@/lib/server/drive";
import { ALLOWED_MIME, safeFileName } from "@/features/library/logic";
import catalog from "@/features/library/catalog.json";
import { isAllowedCatalogUrl, type CatalogFile } from "@/features/library/catalog";

/* استيراد ملف من مجلد المكتبة على Google Drive إلى حاوية المكتبة — للمحرّرين والأدمن فقط.
   ملفات «المكتبة الجاهزة» (catalog.json) معروفة مسبقًا؛ وأي ملف آخر يُقبل إن كان داخل مجلد المكتبة.
   طريقتان: بلا جسم ⇐ الخادم يجلبه عبر Drive API (DRIVE_API_KEY)؛ بجسم ⇐ متصفح الأدمن جلبه بنفسه (حين لا يوجد المفتاح).
   ومن القائمة الجاهزة أيضًا: ?url= رابط عام مدرج فيها ومن موقع مسموح (يجلبه الخادم)، و?upload= اسم ملف مدرج يرفعه الأدمن من جهازه.
   الملف يُمرَّر تدفّقًا إلى R2 دون تحميله كاملًا في الذاكرة. */

const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "video/mp4": "mp4",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};
const MAX_BYTES = 100 * 1024 * 1024;

const FILES = (catalog as { files: CatalogFile[] }[]).flatMap((c) => c.files);
const CATALOG = new Map(FILES.filter((f) => f.driveId).map((f) => [f.driveId!, f] as const));
const BY_URL = new Map(FILES.filter((f) => f.url && isAllowedCatalogUrl(f.url)).map((f) => [f.url!, f] as const));
const BY_UPLOAD = new Map(FILES.filter((f) => f.upload).map((f) => [f.name, f] as const));

async function requireEditor(req: Request) {
  const user = await requireUser(req);
  if (!user.roles.admin && !user.roles.contentEditor) throw new HttpError(403, "forbidden");
  return user;
}

export async function POST(req: Request) {
  try {
    await requireEditor(req);
    const params = new URL(req.url).searchParams;
    const uploaded = Number(req.headers.get("content-length") ?? 0) > 0 && req.body;
    const url = params.get("url");
    const uploadName = params.get("upload");
    let file: { name: string; mime: string; size: number | null };
    let body: ReadableStream<Uint8Array>;
    let length: number;

    if (url !== null) {
      // رابط عام من القائمة الجاهزة فقط، ومن موقع مسموح؛ لا تتبّع لإعادة التوجيه خارجها
      const known = BY_URL.get(url);
      if (!known) throw new HttpError(400, "unknown url");
      const res = await fetch(url, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 (compatible; ProfAssistant library import)" } });
      if (!res.ok || !res.body) throw new HttpError(502, `source ${res.status}`);
      file = known;
      body = res.body;
      length = Number(res.headers.get("content-length") ?? 0) || (known.size ?? 0);
    } else if (uploadName !== null) {
      // ملف من موادنا يرفعه الأدمن من جهازه: الاسم مدرج في القائمة الجاهزة
      const known = BY_UPLOAD.get(uploadName);
      if (!known) throw new HttpError(400, "unknown file");
      if (!uploaded) throw new HttpError(400, "file required");
      file = known;
      body = req.body!;
      length = Number(req.headers.get("content-length"));
    } else {
      const driveId = params.get("driveId") ?? "";
      if (!/^[A-Za-z0-9_-]{10,80}$/.test(driveId)) throw new HttpError(400, "bad id");
      const known = CATALOG.get(driveId);
      // ملف خارج القائمة الجاهزة: نتحقق من Drive أنه داخل مجلد المكتبة (ويلزم المفتاح)
      file = known ?? { driveId, ...(await libraryFile(driveId)) };
      if (!(ALLOWED_MIME as readonly string[]).includes(file.mime)) throw new HttpError(415, "unsupported type");
      if (uploaded) {
        body = req.body!;
        length = Number(req.headers.get("content-length"));
      } else {
        const res = await fetchDriveMedia(driveId);
        body = res.body!;
        // الملفات الكبيرة تأتي مقطّعة بلا Content-Length: نعتمد الحجم المعروف (يتحقق منه FixedLengthStream)
        length = Number(res.headers.get("content-length") ?? 0) || (file.size ?? 0);
      }
    }
    if (!(ALLOWED_MIME as readonly string[]).includes(file.mime) || !EXT[file.mime]) throw new HttpError(415, "unsupported type");
    if (!(length > 0) || length > MAX_BYTES) throw new HttpError(413, "bad size");

    const key = `content/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${EXT[file.mime]}`;
    const bucket = await contentBucket();
    if (typeof FixedLengthStream !== "undefined") {
      const stream = new FixedLengthStream(length);
      await Promise.all([bucket.put(key, stream.readable, { httpMetadata: { contentType: file.mime } }), body.pipeTo(stream.writable)]);
    } else {
      await bucket.put(key, await new Response(body).arrayBuffer(), { httpMetadata: { contentType: file.mime } });
    }
    return Response.json({ key, name: safeFileName(file.name), mime: file.mime, size: length });
  } catch (error) {
    console.error("library-import", error);
    return errorResponse(error);
  }
}
