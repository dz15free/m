import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { contentBucket } from "@/lib/server/storage";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
const MAX = 5 * 1024 * 1024;

/* رفع إيصال الدفع اليدوي إلى مجلد الأستاذ الخاص في R2 (لا يراه إلا المالية/الأدمن). */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const mime = (req.headers.get("content-type") ?? "").split(";")[0]!.trim();
    const ext = TYPES[mime];
    if (!ext) throw new HttpError(415, "unsupported type");
    const body = await req.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > MAX) throw new HttpError(413, "bad size");
    const key = `receipts/${user.uid}/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${ext}`;
    await (await contentBucket()).put(key, body, { httpMetadata: { contentType: mime } });
    return Response.json({ key });
  } catch (error) {
    return errorResponse(error);
  }
}
