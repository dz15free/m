import { getCloudflareContext } from "@opennextjs/cloudflare";
import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { contentBucket } from "@/lib/server/storage";
import { ALLOWED_MIME, safeFileName } from "@/features/library/logic";
import catalog from "@/features/library/catalog.json";

/* استيراد ملف من «المكتبة الجاهزة» (catalog.json) إلى حاوية المكتبة — للمحرّرين والأدمن فقط. طريقتان:
   1) بلا جسم: الخادم يجلب الملف عبر Google Drive API بمفتاح السر DRIVE_API_KEY (الطريقة الثابتة)؛
   2) بجسم: متصفح الأدمن جلب الملف من Drive بنفسه وأرسله هنا (حين لا يوجد المفتاح).
   في الحالتين: لا يُقبل إلا ملف مدرج في القائمة وبنوعه المعلن، ويُمرَّر تدفّقًا إلى R2. */

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

async function driveKey(): Promise<string | undefined> {
  const { env } = await getCloudflareContext({ async: true });
  return (env as { DRIVE_API_KEY?: string }).DRIVE_API_KEY || process.env.DRIVE_API_KEY;
}

export async function POST(req: Request) {
  try {
    await requireEditor(req);
    const driveId = new URL(req.url).searchParams.get("driveId") ?? "";
    const file = FILES.get(driveId);
    if (!file) throw new HttpError(404, "not in catalog");
    if (!(ALLOWED_MIME as readonly string[]).includes(file.mime) || !EXT[file.mime]) throw new HttpError(415, "unsupported type");

    let body: ReadableStream<Uint8Array>;
    let length = Number(req.headers.get("content-length") ?? 0);
    if (length > 0 && req.body) {
      body = req.body;
    } else {
      const key = await driveKey();
      if (!key) throw new HttpError(503, "drive key missing");
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.driveId)}?alt=media&key=${encodeURIComponent(key)}`);
      if (!res.ok || !res.body) {
        const reason = ((await res.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message ?? "";
        throw new HttpError(502, `drive api ${res.status} ${reason}`.trim().slice(0, 200));
      }
      body = res.body;
      length = Number(res.headers.get("content-length") ?? 0);
    }
    if (!(length > 0) || length > MAX_BYTES) throw new HttpError(413, "bad size");

    const key = `content/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${EXT[file.mime]}`;
    const bucket = await contentBucket();
    if (typeof FixedLengthStream !== "undefined") {
      // R2 يحتاج طولًا معروفًا للتدفّق
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
