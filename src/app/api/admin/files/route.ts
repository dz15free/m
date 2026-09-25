import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { contentBucket } from "@/lib/server/storage";
import { ALLOWED_MIME, MAX_FILE_BYTES, safeFileName } from "@/features/library/logic";

/* رفع ملفات المكتبة وحذفها — للمحرّرين والأدمن فقط (Custom claims). */

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
const PREVIEW_MIME = ["image/jpeg", "image/png", "image/webp"];
const PREVIEW_MAX = 2 * 1024 * 1024;

async function requireEditor(req: Request) {
  const user = await requireUser(req);
  if (!user.roles.admin && !user.roles.contentEditor) throw new HttpError(403, "forbidden");
  return user;
}

export async function POST(req: Request) {
  try {
    await requireEditor(req);
    const kind = new URL(req.url).searchParams.get("kind") === "preview" ? "preview" : "content";
    const mime = (req.headers.get("content-type") ?? "").split(";")[0]!.trim();
    const allowed = kind === "preview" ? PREVIEW_MIME : (ALLOWED_MIME as readonly string[]);
    if (!allowed.includes(mime)) throw new HttpError(415, "unsupported type");

    const body = await req.arrayBuffer();
    const max = kind === "preview" ? PREVIEW_MAX : MAX_FILE_BYTES;
    if (body.byteLength === 0 || body.byteLength > max) throw new HttpError(413, "bad size");

    const name = safeFileName(decodeURIComponent(req.headers.get("x-file-name") ?? "file"));
    const key = `${kind === "preview" ? "previews" : "content"}/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${EXT[mime]}`;
    await (await contentBucket()).put(key, body, { httpMetadata: { contentType: mime } });
    return Response.json({ key, name, mime, size: body.byteLength });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireEditor(req);
    const key = new URL(req.url).searchParams.get("key") ?? "";
    if (!/^(content|previews)\/\d{4}\/[0-9a-f-]{36}\.[a-z0-9]{2,4}$/.test(key)) throw new HttpError(400, "bad key");
    await (await contentBucket()).delete(key);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
