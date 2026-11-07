import { geminiEnv } from "@/lib/server/gemini-env";

/* فحص عام لإعداد كاتب المذكرات: هل يرى الخادم مفتاح Gemini؟ (نعم/لا فقط، دون أي قيمة) — للتشخيص بعد إضافة السرّ في Cloudflare. */
export const dynamic = "force-dynamic";

export async function GET() {
  const { key, model } = await geminiEnv();
  return Response.json({ configured: !!key, model }, { headers: { "Cache-Control": "no-store" } });
}
