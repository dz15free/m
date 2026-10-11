/* تقسيم وثيقة طويلة إلى صفحات دون قطع سطر أو صف جدول أو صورة في منتصفه.
   keep: مجالات لا يجوز القطع داخلها (أسطر النص، صفوف الجداول، الصور، ما عليه break-inside: avoid).
   forced: مواضع قطع إجبارية (break-before/after: page). كل القيم بالبكسل من أعلى الوثيقة. */

export type Span = { top: number; bottom: number };

const EPS = 0.5;

export function paginate({ total, pageH, keep, forced }: { total: number; pageH: number; keep: Span[]; forced: number[] }): Span[] {
  if (!(total > 0) || !(pageH > 0)) return [];
  // ما هو أطول من صفحة لا يمكن إبقاؤه كاملًا: يُقطع عند الحاجة
  const spans = keep.filter((s) => s.bottom - s.top > EPS && s.bottom - s.top <= pageH).sort((a, b) => a.top - b.top);
  const breaks = [...new Set(forced.map((f) => Math.round(f * 2) / 2))].filter((f) => f > EPS && f < total - EPS).sort((a, b) => a - b);
  const inside = (y: number) => spans.some((s) => s.top < y - EPS && s.bottom > y + EPS);

  const pages: Span[] = [];
  let start = 0;
  while (start < total - EPS) {
    const limit = Math.min(start + pageH, total);
    const hard = breaks.find((f) => f > start + EPS && f <= limit + EPS);
    let end: number;
    if (hard !== undefined) end = hard;
    else if (limit >= total - EPS) end = total;
    else {
      // أبعد حدّ (بداية أو نهاية عنصر) لا يقع داخل عنصر محمي، على ألا تقل الصفحة عن ثلثها
      const floor = start + pageH / 3;
      const candidates = new Set<number>([limit]);
      for (const s of spans) {
        if (s.top > limit) break;
        if (s.bottom <= limit && s.bottom > floor) candidates.add(s.bottom);
        if (s.top > floor) candidates.add(s.top);
      }
      end = [...candidates].sort((a, b) => b - a).find((y) => !inside(y)) ?? limit;
    }
    pages.push({ top: start, bottom: end });
    start = end;
  }
  return pages;
}
