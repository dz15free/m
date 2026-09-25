import { errorResponse, HttpError } from "@/lib/server/auth";
import { contentBucket } from "@/lib/server/storage";

/* صور المعاينة عامة (مثل العنوان والوصف) وثابتة: المفتاح فريد فتُكاش طويلًا. */
export async function GET(_req: Request, { params }: RouteContext<"/api/previews/[...key]">) {
  try {
    const key = `previews/${(await params).key.join("/")}`;
    if (!/^previews\/\d{4}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key)) throw new HttpError(404, "not found");
    const object = await (await contentBucket()).get(key);
    if (!object) throw new HttpError(404, "not found");
    return new Response(object.body, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType ?? "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
