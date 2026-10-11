"use client";

import { useEffect, useState } from "react";

/* بيانات صفحة الهبوط العامة (آراء الأساتذة وعدد المذكرات) من /api/public/landing — طلب واحد تتشاركه المكوّنات. */
export type Testimonial = { id: string; rating: number; comment: string; firstName: string; stage: string; wilaya: { ar: string; fr: string } | null; reasons: string[]; at: number };
export type LandingData = { testimonials: Testimonial[]; average: number; count: number; reasons: Record<string, number>; memos: number };

let pending: Promise<LandingData | null> | null = null;

function fetchLanding(): Promise<LandingData | null> {
  pending ??= fetch("/api/public/landing")
    .then((r) => (r.ok ? (r.json() as Promise<LandingData>) : null))
    .catch(() => null);
  return pending;
}

export function useLandingData(): LandingData | null | undefined {
  const [data, setData] = useState<LandingData | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    void fetchLanding().then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, []);
  return data;
}
