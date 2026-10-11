import { landingData } from "@/lib/server/landing-data";

/* عامّ (بلا دخول): آراء مختارة بلا أسماء كاملة ولا بريد، وعدد المذكرات الجاهزة. */
export async function GET() {
  try {
    const data = await landingData();
    return Response.json(data, { headers: { "Cache-Control": "public, max-age=600, s-maxage=3600" } });
  } catch {
    return Response.json({ testimonials: [], average: 0, count: 0, reasons: {}, memos: 0 }, { headers: { "Cache-Control": "no-store" } });
  }
}
