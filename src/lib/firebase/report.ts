"use client";

import { authedFetch } from "./api";

/** يسجّل خطأ ميدانيًا (مثل فشل قراءة ملف على هاتف أستاذ) لتشخيصه لاحقًا — دون أي محتوى من الملف. */
export function reportClientError(where: string, error: unknown, extra: Record<string, string | number> = {}) {
  const e = error instanceof Error ? error : new Error(String(error));
  void authedFetch("/api/client-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ where, message: `${e.name}: ${e.message}`.slice(0, 500), stack: (e.stack ?? "").slice(0, 1500), extra }),
  }).catch(() => {});
}
