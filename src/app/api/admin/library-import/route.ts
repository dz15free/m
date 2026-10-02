import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { contentBucket } from "@/lib/server/storage";
import { fetchDriveMedia, libraryFile } from "@/lib/server/drive";
import { ALLOWED_MIME, safeFileName } from "@/features/library/logic";
import catalog from "@/features/library/catalog.json";

/* استيراد ملف من مجلد المكتبة على Google Drive إلى حاوية المكتبة — للمحرّرين والأدمن فقط.
   ملفات «المكتبة الجاهزة» (catalog.json) معروفة مسبقًا؛ وأي ملف آخر يُقبل إن كان داخل مجلد المكتبة.
   طريقتان: بلا جسم ⇐ الخادم يجلبه عبر Drive API (DRIVE_API_KEY)؛ بجسم ⇐ متصفح الأدمن جلبه بنفسه (حين لا يوجد المفتاح).
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

type CatalogFile = { driveId: string; name: string; mime: string; size: number | null };
const CATALOG = new Map<string, CatalogFile>(
  (catalog as { files: CatalogFile[] }[]).flatMap((c) => c.files.map((f) => [f.driveId, f] as const)),
);

async function requireEditor(req: Request) {
  const user = await requireUser(req);
  if (!user.roles.admin && !user.roles.contentEditor) throw new HttpError(403, "forbidden");
  return user;
}

export async function POST(req: Request) {
  try {
    await requireEditor(req);
    const driveId = new URL(req.url).searchParams.get("driveId") ?? "";
    if (!/^[A-Za-z0-9_-]{10,80}$/.test(driveId)) throw new HttpError(400, "bad id");
    const known = CATALOG.get(driveId);
    const uploaded = Number(req.headers.get("content-length") ?? 0) > 0 && req.body;
    // ملف خارج القائمة الجاهزة: نتحقق من Drive أنه داخل مجلد المكتبة (ويلزم المفتاح)
    const file = known ?? { driveId, ...(await libraryFile(driveId)) };
    if (!(ALLOWED_MIME as readonly string[]).includes(file.mime) || !EXT[file.mime]) throw new HttpError(415, "unsupported type");

    let body: ReadableStream<Uint8Array>;
    let length: number;
    if (uploaded) {
      body = req.body!;
      length = Number(req.headers.get("content-length"));
    } else {
      const res = await fetchDriveMedia(driveId);
      body = res.body!;
      // الملفات الكبيرة تأتي مقطّعة بلا Content-Length: نعتمد الحجم المعروف (يتحقق منه FixedLengthStream)
      length = Number(res.headers.get("content-length") ?? 0) || (file.size ?? 0);
    }
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
