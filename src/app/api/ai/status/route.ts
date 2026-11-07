import { serverEnv } from "@/lib/server/env";

/* فحص عام لإعداد كاتب المذكرات: هل يرى الخادم مفتاح Gemini؟ (نعم/لا فقط، دون أي قيمة) — للتشخيص بعد إضافة السرّ في Cloudflare. */
export const dynamic = "force-dynamic";

export function GET() {
  const env = serverEnv();
  return Response.json({ configured: !!env.GEMINI_API_KEY, model: env.GEMINI_MODEL }, { headers: { "Cache-Control": "no-store" } });
}
