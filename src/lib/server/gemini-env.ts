import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/* مفتاح Gemini ونموذجه: من روابط Cloudflare مباشرة (مثل DRIVE_API_KEY في drive.ts)، ثم process.env احتياطًا. */
export async function geminiEnv(): Promise<{ key: string | undefined; model: string }> {
  let e: { GEMINI_API_KEY?: string; GEMINI_MODEL?: string } = {};
  try {
    e = (await getCloudflareContext({ async: true })).env as typeof e;
  } catch {
    // خارج Cloudflare (التطوير المحلي)
  }
  const key = (e.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "").trim() || undefined;
  const model = (e.GEMINI_MODEL || process.env.GEMINI_MODEL || "").trim() || "gemini-2.5-flash";
  return { key, model };
}
