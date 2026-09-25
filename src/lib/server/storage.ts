import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { HttpError } from "./auth";

/** حاوية R2 لملفات المكتبة (ربط Worker، بلا مفاتيح وصول). */
export async function contentBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.CONTENT) throw new HttpError(503, "storage not configured");
  return env.CONTENT;
}
