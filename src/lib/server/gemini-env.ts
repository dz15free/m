import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { adminGet } from "./firestore-admin";

/* مفتاح Gemini ونموذجه، بالترتيب: روابط Cloudflare (سرّ GEMINI_API_KEY)، process.env، ثم الوثيقة الخاصة
   serverSecrets/gemini التي يحفظها الأدمن من لوحة الإعدادات (عبر /api/admin/ai-key؛ لا قاعدة تسمح بقراءتها من المتصفح).
   تُحفظ قيمة الوثيقة في الذاكرة دقيقة واحدة. */
let stored: { key?: string; model?: string; at: number } | null = null;

export async function storedGemini(): Promise<{ key?: string; model?: string }> {
  if (stored && Date.now() - stored.at < 60_000) return stored;
  const d = (await adminGet("serverSecrets/gemini").catch(() => null))?.data ?? {};
  stored = { key: typeof d.key === "string" ? d.key : undefined, model: typeof d.model === "string" ? d.model : undefined, at: Date.now() };
  return stored;
}

export function forgetStoredGemini() {
  stored = null;
}

export async function geminiEnv(): Promise<{ key: string | undefined; model: string; source: "cloudflare" | "admin" | null }> {
  let e: { GEMINI_API_KEY?: string; GEMINI_MODEL?: string } = {};
  try {
    e = (await getCloudflareContext({ async: true })).env as typeof e;
  } catch {
    // خارج Cloudflare (التطوير المحلي)
  }
  const envKey = (e.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
  const envModel = (e.GEMINI_MODEL || process.env.GEMINI_MODEL || "").trim();
  if (envKey) return { key: envKey, model: envModel || "gemini-2.5-flash", source: "cloudflare" };
  const s = await storedGemini();
  return { key: s.key?.trim() || undefined, model: envModel || s.model || "gemini-2.5-flash", source: s.key ? "admin" : null };
}
