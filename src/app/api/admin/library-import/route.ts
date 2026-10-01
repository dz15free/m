import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { contentBucket } from "@/lib/server/storage";
import { ALLOWED_MIME, safeFileName } from "@/features/library/logic";
import catalog from "@/features/library/catalog.json";

/* استيراد ملف من «المكتبة الجاهزة» (catalog.json) إلى حاوية المكتبة — للمحرّرين والأدمن فقط.
   متصفح الأدمن يجلب الملف من Google Drive (Google يرفض كثيرًا طلبات خوادم مراكز البيانات) ثم يرسله هنا؛
   لا يُقبل إلا ملف مدرج في القائمة وبنوعه المعلن، ويُمرَّر تدفّقًا إلى R2 دون تحميله كاملًا في الذاكرة. */

const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};
const MAX_BYTES = 100 * 1024 * 1024;

type CatalogFile = { driveId: string; name: string; mime: string };
const FILES = new Map<string, CatalogFile>(
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
    const file = FILES.get(driveId);
    if (!file) throw new HttpError(404, "not in catalog");
    if (!(ALLOWED_MIME as readonly string[]).includes(file.mime) || !EXT[file.mime]) throw new HttpError(415, "unsupported type");

    const length = Number(req.headers.get("content-length") ?? 0);
    if (!req.body || !(length > 0) || length > MAX_BYTES) throw new HttpError(413, "bad size");

    const key = `content/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${EXT[file.mime]}`;
    const bucket = await contentBucket();
    if (typeof FixedLengthStream !== "undefined") {
      // R2 يحتاج طولًا معروفًا للتدفّق
      const stream = new FixedLengthStream(length);
      await Promise.all([bucket.put(key, stream.readable, { httpMetadata: { contentType: file.mime } }), req.body.pipeTo(stream.writable)]);
    } else {
      await bucket.put(key, await req.arrayBuffer(), { httpMetadata: { contentType: file.mime } });
    }
    return Response.json({ key, name: safeFileName(file.name), mime: file.mime, size: length });
  } catch (error) {
    console.error("library-import", error);
    return errorResponse(error);
  }
}
