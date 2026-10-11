"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";
import { authedFetch } from "@/lib/firebase/api";
import type { Stage } from "@/shared/dz/education";
import { toIndexEntry, type ContentDoc, type ContentFile, type IndexEntry } from "./logic";

const db = () => getFirebase().db;
const contentsCol = () => collection(db(), "contents");
const indexRef = (stage: Stage) => doc(db(), "contentIndex", stage);

/** فهرس المكتبة كاملًا لمرحلة: قراءة واحدة. */
export async function getIndex(stage: Stage): Promise<IndexEntry[]> {
  const snap = await getDoc(indexRef(stage));
  return snap.exists() ? ((snap.data().entries as IndexEntry[]) ?? []) : [];
}

export type ContentWithId = ContentDoc & { id: string };

export async function getContent(id: string): Promise<ContentWithId | null> {
  try {
    const snap = await getDoc(doc(contentsCol(), id));
    return snap.exists() ? { id: snap.id, ...(snap.data() as ContentDoc) } : null;
  } catch {
    // مسودة لا يحق للأستاذ رؤيتها ⇐ كأنها غير موجودة
    return null;
  }
}

// ── المحرّرون ──

export async function listContentsForEditor(stage: Stage): Promise<ContentWithId[]> {
  const snap = await getDocs(query(contentsCol(), where("stage", "==", stage)));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as ContentDoc) }))
    .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
}

/** حفظ المحتوى وتحديث سطره في الفهرس معًا (معاملة واحدة). يُرجع المعرّف. */
export async function saveContent(content: ContentDoc, id?: string): Promise<string> {
  const ref = id ? doc(contentsCol(), id) : doc(contentsCol());
  const published = content.status === "published";
  const data: ContentDoc = { ...content, publishedAt: published ? (content.publishedAt ?? Date.now()) : content.publishedAt };
  await runTransaction(db(), async (tx) => {
    // كل القراءات قبل أي كتابة (شرط المعاملات)
    const prevStage = id ? ((await tx.get(ref)).data()?.stage as Stage | undefined) : undefined;
    const idx = await tx.get(indexRef(content.stage));
    const old = prevStage && prevStage !== content.stage ? await tx.get(indexRef(prevStage)) : null;

    const others = ((idx.data()?.entries as IndexEntry[]) ?? []).filter((e) => e.id !== ref.id);
    tx.set(ref, { ...data, updatedAt: serverTimestamp() });
    tx.set(indexRef(content.stage), { entries: published ? [toIndexEntry(ref.id, data), ...others] : others, updatedAt: serverTimestamp() });
    if (old && prevStage) {
      const rest = ((old.data()?.entries as IndexEntry[]) ?? []).filter((e) => e.id !== ref.id);
      tx.set(indexRef(prevStage), { entries: rest, updatedAt: serverTimestamp() });
    }
  });
  return ref.id;
}

export async function deleteContent(id: string, stage: Stage, files: ContentFile[], previewKey: string) {
  await runTransaction(db(), async (tx) => {
    const idx = await tx.get(indexRef(stage));
    const rest = ((idx.data()?.entries as IndexEntry[]) ?? []).filter((e) => e.id !== id);
    tx.set(indexRef(stage), { entries: rest, updatedAt: serverTimestamp() });
    tx.delete(doc(contentsCol(), id));
  });
  // الملفات بعد المستند: ملف يتيم أهون من محتوى بلا ملف
  await Promise.all([...files.map((f) => f.key), previewKey].filter(Boolean).map((k) => removeFile(k)));
}

export async function uploadFile(file: File, kind: "content" | "preview"): Promise<ContentFile> {
  const res = await authedFetch(`/api/admin/files?kind=${kind}`, {
    method: "POST",
    headers: { "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name) },
    body: file,
  });
  if (!res.ok) throw new Error(`upload ${res.status}`);
  return (await res.json()) as ContentFile;
}

export async function removeFile(key: string) {
  await authedFetch(`/api/admin/files?key=${encodeURIComponent(key)}`, { method: "DELETE" }).catch(() => {});
}

// ── الأستاذ: فتح ملف أو تحميله ──

export class PremiumRequired extends Error {}

/** يجلب الملف برمز المستخدم (لا روابط دائمة) ثم يفتحه أو يحمّله محليًا. */
export async function fetchFile(contentId: string, index: number): Promise<Blob> {
  const res = await authedFetch(`/api/files/${contentId}/${index}`);
  if (res.status === 402) throw new PremiumRequired();
  if (!res.ok) throw new Error(`file ${res.status}`);
  return res.blob();
}

export const previewUrl = (key: string) => `/api/${key}`;


const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** نتيجة الطلب ورسالة الخطأ إن وُجدت. */
async function importRequest(driveId: string, init: RequestInit): Promise<{ ok: true; file: ContentFile } | { ok: false; status: number; error: string }> {
  const res = await authedFetch(`/api/admin/library-import?driveId=${encodeURIComponent(driveId)}`, { method: "POST", ...init });
  if (res.ok) return { ok: true, file: (await res.json()) as ContentFile };
  const error = ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "";
  return { ok: false, status: res.status, error };
}

/** تحميل من Drive في المتصفح، مع إعادة المحاولة (Google يحدّ التحميلات المتتالية). */
export async function browserDownload(driveId: string): Promise<Blob> {
  let last = "";
  for (const wait of [0, 5_000, 20_000]) {
    if (wait) await sleep(wait);
    try {
      const res = await fetch(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(driveId)}&export=download&confirm=t`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if ((res.headers.get("content-type") ?? "").startsWith("text/html")) throw new Error("not shared publicly");
      return await res.blob();
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`Drive: ${last}`);
}

/** استيراد ملف من «المكتبة الجاهزة»: الخادم يجلبه عبر Drive API إن كان مفتاحه مضبوطًا،
    وإلا يحمّله المتصفح ويرسله. الخطأ يحمل المرحلة والسبب ليُعرض للأدمن. */
export async function importCatalogFile(file: { driveId: string; mime: string }): Promise<ContentFile> {
  const server = await importRequest(file.driveId, {});
  if (server.ok) return server.file;
  if (!(server.status === 503 && server.error === "drive key missing")) throw new Error(`server ${server.status} ${server.error}`.trim());
  const blob = await browserDownload(file.driveId);
  const res = await importRequest(file.driveId, { headers: { "Content-Type": file.mime }, body: blob });
  if (!res.ok) throw new Error(`upload ${res.status} ${res.error}`.trim());
  return res.file;
}

/** محتويات مجلد المكتبة على Drive (للأدمن): لعرض الملفات الجديدة. */
export async function listDriveLibrary(): Promise<{ id: string; name: string; path: string; mime: string; size: number }[]> {
  const res = await authedFetch("/api/admin/library-drive");
  if (!res.ok) {
    const error = ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "";
    throw new Error(`${res.status} ${error}`.trim());
  }
  return ((await res.json()) as { files: { id: string; name: string; path: string; mime: string; size: number }[] }).files;
}
