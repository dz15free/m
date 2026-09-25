import { errorResponse, HttpError, requireUser } from "@/lib/server/auth";
import { contentBucket } from "@/lib/server/storage";

/* عرض إيصال للمراجعة — المالية والأدمن فقط، بلا كاش. */
export async function GET(req: Request, { params }: RouteContext<"/api/admin/receipts/[...key]">) {
  try {
    const user = await requireUser(req);
    if (!user.roles.admin && !user.roles.finance) throw new HttpError(403, "forbidden");
    const key = `receipts/${(await params).key.join("/")}`;
    if (!/^receipts\/[\w-]{1,128}\/\d{4}\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/.test(key)) throw new HttpError(404, "not found");
    const object = await (await contentBucket()).get(key);
    if (!object) throw new HttpError(404, "not found");
    return new Response(object.body, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
