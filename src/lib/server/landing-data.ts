import "server-only";
import { adminGet, adminListAll } from "./firestore-admin";
import { wilayaByCode } from "@/shared/dz/wilayas";

/* بيانات صفحة الهبوط العامة: آراء الأساتذة (4 و5 نجوم بتعليق، بالاسم الأول والولاية فقط، ما لم يخفها الأدمن)
   وعدد المذكرات الجاهزة (يُحسب من فهارس المناهج المنشورة فيتحدّث وحده). مخزّنة في الذاكرة لساعة. */

export type Testimonial = { id: string; rating: number; comment: string; firstName: string; stage: string; wilaya: { ar: string; fr: string } | null; reasons: string[]; at: number };
export type LandingData = { testimonials: Testimonial[]; average: number; count: number; reasons: Record<string, number>; memos: number };

const TTL = 60 * 60 * 1000;
const MAX_SHOWN = 24;
let cache: { at: number; data: LandingData } | null = null;

const firstWord = (s: unknown) => (typeof s === "string" ? s.trim().split(/\s+/)[0] ?? "" : "").slice(0, 30);
const millis = (v: unknown) => (typeof v === "number" ? v : v instanceof Date ? v.getTime() : typeof v === "string" ? Date.parse(v) || 0 : 0);

async function load(): Promise<LandingData> {
  const [feedback, config, curricula] = await Promise.all([
    adminListAll("feedback", ["rating", "comment", "reasons", "updatedAt"]),
    adminGet("config/testimonials").catch(() => null),
    adminListAll("curriculum", ["entries"]).catch(() => []),
  ]);
  const ids = (v: unknown) => new Set(Array.isArray(v) ? (v as string[]) : []);
  const hidden = ids(config?.data.hidden);
  // يعرض الأدمن أي رأي (shown) أو يخفيه (hidden)؛ وإلا تُعرض تلقائيًا آراء 4 و5 نجوم بتعليق
  const shown = ids(config?.data.shown);
  const good = feedback
    .map((f) => ({ id: f.id, rating: Number(f.data.rating) || 0, comment: String(f.data.comment ?? "").trim(), reasons: (f.data.reasons as string[] | undefined) ?? [], at: millis(f.data.updatedAt) }))
    .filter((f) => !hidden.has(f.id) && (shown.has(f.id) || (f.rating >= 4 && f.comment.length >= 12)))
    .sort((a, b) => b.rating - a.rating || b.at - a.at)
    .slice(0, MAX_SHOWN);

  const testimonials = await Promise.all(
    good.map(async (f): Promise<Testimonial> => {
      const [teacher, user] = await Promise.all([adminGet(`teachers/${f.id}`).catch(() => null), adminGet(`users/${f.id}`).catch(() => null)]);
      const w = wilayaByCode(Number(teacher?.data.wilayaCode));
      return {
        ...f,
        firstName: firstWord(teacher?.data.firstName) || firstWord(user?.data.displayName),
        stage: String(teacher?.data.stage ?? "primary"),
        wilaya: w ? { ar: w.ar, fr: w.fr } : null,
      };
    }),
  );
  const reasons: Record<string, number> = {};
  for (const t of testimonials) for (const r of t.reasons) reasons[r] = (reasons[r] ?? 0) + 1;
  const memos = curricula.reduce((n, c) => n + ((c.data.entries as { b?: boolean }[] | undefined) ?? []).filter((e) => e.b).length, 0);
  return {
    testimonials,
    count: testimonials.length,
    average: testimonials.length ? testimonials.reduce((a, t) => a + t.rating, 0) / testimonials.length : 0,
    reasons,
    memos,
  };
}

export async function landingData(): Promise<LandingData> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  const data = await load();
  cache = { at: Date.now(), data };
  return data;
}
