import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { HttpError } from "./auth";

/** حاوية R2 لملفات المكتبة (ربط Worker، بلا مفاتيح وصول). */
export async function contentBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  // الربط اختياري: يُضاف في wrangler.jsonc بعد إنشاء الحاوية (وإلا 503 بدل فشل النشر)
  const bucket = (env as { CONTENT?: R2Bucket }).CONTENT;
  if (!bucket) throw new HttpError(503, "storage not configured");
  return bucket;
}
