import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { contentBucket } from "@/lib/server/storage";
import { ALLOWED_MIME, safeFileName } from "@/features/library/logic";
import catalog from "@/features/library/catalog.json";

/* استيراد ملف من «المكتبة الجاهزة» (catalog.json) إلى حاوية المكتبة — للمحرّرين والأدمن فقط.
   الخادم يجلب الملف من Google Drive مباشرة (لا يمر عبر جهاز الأدمن)، ولا يقبل إلا معرّفات القائمة. */

const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};
/** أكبر ملف في القائمة ≈ 80 MB؛ الملف يُمرَّر تدفّقًا إلى R2 دون تحميله كاملًا في الذاكرة. */
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
    const { driveId } = (await req.json().catch(() => ({}))) as { driveId?: string };
    const file = typeof driveId === "string" ? FILES.get(driveId) : undefined;
    if (!file) throw new HttpError(404, "not in catalog");
    if (!(ALLOWED_MIME as readonly string[]).includes(file.mime) || !EXT[file.mime]) throw new HttpError(415, "unsupported type");

    const res = await fetch(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(file.driveId)}&export=download&confirm=t`, {
      redirect: "follow",
    });
    const type = res.headers.get("content-type") ?? "";
    const length = Number(res.headers.get("content-length") ?? 0);
    // صفحة HTML بدل الملف = الملف غير مشارك للعموم أو حُذف
    if (!res.ok || !res.body || type.startsWith("text/html")) throw new HttpError(502, "drive fetch failed");
    if (length > MAX_BYTES) throw new HttpError(413, "too large");

    const key = `content/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${EXT[file.mime]}`;
    const bucket = await contentBucket();
    let size: number;
    if (length > 0 && typeof FixedLengthStream !== "undefined") {
      // R2 يحتاج طولًا معروفًا للتدفّق
      const stream = new FixedLengthStream(length);
      const [put] = await Promise.all([
        bucket.put(key, stream.readable, { httpMetadata: { contentType: file.mime } }),
        res.body.pipeTo(stream.writable),
      ]);
      size = put?.size ?? length;
    } else {
      const body = await res.arrayBuffer();
      if (body.byteLength === 0 || body.byteLength > MAX_BYTES) throw new HttpError(413, "bad size");
      await bucket.put(key, body, { httpMetadata: { contentType: file.mime } });
      size = body.byteLength;
    }
    return Response.json({ key, name: safeFileName(file.name), mime: file.mime, size });
  } catch (error) {
    return errorResponse(error);
  }
}
