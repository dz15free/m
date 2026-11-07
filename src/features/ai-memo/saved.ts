"use client";

import { authedFetch } from "@/lib/firebase/api";

/* مذكرات الأستاذ المحفوظة (عبر /api/ai/memos). */
export type SavedItem = {
  id: string;
  title: string;
  level: string;
  subject: string;
  lang: "ar" | "fr" | "en";
  updatedAt: number;
};
export type SavedMemo = SavedItem & { html: string };

async function json<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? String(res.status));
  return data;
}

export const listSaved = async () =>
  json<{ items: SavedItem[]; max: number }>(await authedFetch("/api/ai/memos"));
export const getSaved = async (id: string) =>
  json<SavedMemo>(
    await authedFetch(`/api/ai/memos?id=${encodeURIComponent(id)}`),
  );
export const deleteSaved = async (id: string) =>
  json<{ ok: true }>(
    await authedFetch(`/api/ai/memos?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  );

export async function saveMemo(memo: {
  id?: string;
  title: string;
  level: string;
  subject: string;
  lang: string;
  html: string;
}): Promise<string> {
  const res = await authedFetch("/api/ai/memos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(memo),
  });
  return (await json<{ id: string }>(res)).id;
}

/** HTML الورقة كما هي في المحرّر الآن (بتعديلات الأستاذ) */
export const sheetHtml = () =>
  document.querySelector("[data-memo-edit]")?.innerHTML ?? "";
